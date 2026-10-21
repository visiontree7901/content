-- 평가인정 과목 관리 대시보드 — 기본 구조
-- 과목(subjects) = 연도 × 교육원 × 과목. 제작 묶음(productions) = 실제 제작 단위(공통 과목은 1개를 같이 씀)

-- ───────── 팀 계정 ─────────
create table public.team_members (
  email text primary key
);
comment on table public.team_members is '편집 권한이 있는 로그인 계정(팀 공용 계정). 여기에 있는 계정만 쓰기 가능';

create or replace function public.is_team()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where email = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  );
$$;

-- 연도 잠금: 올해·다음 연도는 열림, 지난 연도는 다음 해 2월 말까지만 열림 (한국 시간 기준)
create or replace function public.is_year_open(y int)
returns boolean
language sql stable set search_path = ''
as $$
  with now_kst as (select (now() at time zone 'Asia/Seoul') as t)
  select y >= extract(year from t)::int
      or (y = extract(year from t)::int - 1 and extract(month from t) <= 2)
  from now_kst;
$$;

-- ───────── 제작 묶음 ─────────
create table public.productions (
  id bigint generated always as identity primary key,
  year int not null check (year between 2000 and 2100),
  name text not null,
  professor text,
  total_sessions int not null default 26 check (total_sessions between 1 and 60),
  is_practicum boolean not null default false,
  created_at timestamptz not null default now()
);
create index productions_year_idx on public.productions (year);

create or replace function public.production_year(pid bigint)
returns int
language sql stable security definer set search_path = ''
as $$ select year from public.productions where id = pid; $$;

-- ───────── 과목 ─────────
create table public.subjects (
  id bigint generated always as identity primary key,
  year int not null check (year between 2000 and 2100),
  institute text not null check (institute in ('V', 'K')),          -- V 비전 / K 건국
  name text not null,
  professor text,
  eval_type text not null check (eval_type in ('신규', '재평가')),
  prod_status text not null check (prod_status in ('신규촬영', '일부 수정', '재사용')),
  owner text,
  location text,
  dev_year text,
  last_result text,
  fail_reason text,
  note text,
  production_id bigint not null references public.productions (id) on delete restrict,
  deleted_at timestamptz,                                          -- 삭제 표시(복구 가능)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subjects_year_inst_idx on public.subjects (year, institute);
create index subjects_production_idx on public.subjects (production_id);

-- ───────── 비공개 정보(팀 로그인 후에만) ─────────
create table public.subject_private (
  subject_id bigint primary key references public.subjects (id) on delete cascade,
  lecnum text,
  web_folder_old text,
  web_folder_new text,
  cdn_folder_old text,
  cdn_folder_new text,
  phone text,
  email text,
  updated_at timestamptz not null default now()
);

-- ───────── 일부 수정 차시 지정 ─────────
create table public.session_plan (
  production_id bigint not null references public.productions (id) on delete cascade,
  session_no int not null check (session_no between 1 and 60),
  method text not null check (method in ('재촬영', '재편집')),
  primary key (production_id, session_no)
);

-- ───────── 차시별 현재 상태(행이 없으면 미완료) ─────────
create table public.session_status (
  production_id bigint not null references public.productions (id) on delete cascade,
  session_no int not null check (session_no between 1 and 60),
  stage text not null check (stage in ('원고', 'PPT', '촬영', '편집', 'xml', '자막', '재촬영', '재편집')),
  done boolean not null default false,
  done_at timestamptz,
  primary key (production_id, session_no, stage)
);

-- ───────── 작업 기록(지우지 않고 쌓기만) ─────────
create table public.work_logs (
  id bigint generated always as identity primary key,
  production_id bigint not null references public.productions (id) on delete cascade,
  stage text not null check (stage in ('원고', 'PPT', '촬영', '편집', 'xml', '자막', '재촬영', '재편집')),
  done_sessions int[] not null default '{}',
  cancel_sessions int[] not null default '{}',
  workers text[] not null default '{}',
  memo text,
  created_at timestamptz not null default now()
);
create index work_logs_production_idx on public.work_logs (production_id, created_at desc);

-- ───────── 진행 단계 체크 ─────────
create table public.stage_checks (
  production_id bigint not null references public.productions (id) on delete cascade,
  item text not null check (item in ('수업계획서', '콘텐츠제작자료', '쪽지·토론·과제', '중간고사', '기말고사', '최종 탑재')),
  checked boolean not null default false,
  checked_at timestamptz,
  primary key (production_id, item)
);

-- ───────── 교수 소통 내용 · 작업 메모 ─────────
create table public.notes (
  id bigint generated always as identity primary key,
  production_id bigint not null references public.productions (id) on delete cascade,
  kind text not null check (kind in ('교수소통', '작업메모')),
  author text,
  body text not null,
  status text check (status in ('작업 대기', '작업중', '작업완료')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_production_idx on public.notes (production_id, kind);

-- ───────── updated_at 자동 갱신 ─────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;

create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();
create trigger subject_private_touch before update on public.subject_private
  for each row execute function public.touch_updated_at();
create trigger notes_touch before update on public.notes
  for each row execute function public.touch_updated_at();
