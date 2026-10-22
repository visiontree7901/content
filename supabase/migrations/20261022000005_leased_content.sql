-- 타기관 임대 과목: 제작 진행은 기록하지 않고, 받은 자료만 체크
-- 1) 제작 상태에 '타기관 임대' 추가
alter table public.subjects drop constraint subjects_prod_status_check;
alter table public.subjects add constraint subjects_prod_status_check
  check (prod_status in ('신규촬영', '일부 수정', '재사용', '타기관 임대'));

-- 2) 자료 수신 여부
create table public.material_receipts (
  production_id bigint not null references public.productions (id) on delete cascade,
  item text not null check (item in (
    '수업계획서', '교수자료', '콘텐츠관리대장', '학습영상', '음성파일(학습영상음성)',
    '교안', '자막', '스토리보드', '쪽지, 토론, 과제', '중간고사', '기말고사'
  )),
  received boolean not null default false,
  received_at timestamptz,
  primary key (production_id, item)
);

alter table public.material_receipts enable row level security;
create policy "누구나 보기" on public.material_receipts for select to anon, authenticated using (true);
create policy "팀 쓰기" on public.material_receipts for all to authenticated
  using ((select private.is_team()) and public.is_year_open(private.production_year(production_id)))
  with check ((select private.is_team()) and public.is_year_open(private.production_year(production_id)));

-- 3) 2026년 타기관 소유 과목(숭실·에듀업·해밀·서울사이버) → 타기관 임대
update public.subjects set prod_status = '타기관 임대'
where year = 2026 and owner in ('숭실', '에듀업', '해밀', '서울사이버');
