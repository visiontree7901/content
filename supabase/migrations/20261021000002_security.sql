-- 권한: 링크로 들어온 사람은 보기만(비공개 정보 제외), 팀 계정은 쓰기 가능
-- 지난 연도 잠금: 과목 추가(엑셀 업로드 포함)는 항상 허용, 그 외 수정은 열린 연도만

alter table public.team_members    enable row level security;
alter table public.productions     enable row level security;
alter table public.subjects        enable row level security;
alter table public.subject_private enable row level security;
alter table public.session_plan    enable row level security;
alter table public.session_status  enable row level security;
alter table public.work_logs       enable row level security;
alter table public.stage_checks    enable row level security;
alter table public.notes           enable row level security;

-- team_members: 정책 없음 → 사이트에서는 읽기·쓰기 불가(관리 화면에서만 관리)

-- 보기
create policy "누구나 보기" on public.productions    for select to anon, authenticated using (true);
create policy "누구나 보기" on public.subjects       for select to anon, authenticated using (true);
create policy "누구나 보기" on public.session_plan   for select to anon, authenticated using (true);
create policy "누구나 보기" on public.session_status for select to anon, authenticated using (true);
create policy "누구나 보기" on public.work_logs      for select to anon, authenticated using (true);
create policy "누구나 보기" on public.stage_checks   for select to anon, authenticated using (true);
create policy "누구나 보기" on public.notes          for select to anon, authenticated using (true);
create policy "팀만 보기"   on public.subject_private for select to authenticated using ((select public.is_team()));

-- 제작 묶음
create policy "팀 추가" on public.productions for insert to authenticated
  with check ((select public.is_team()));
create policy "팀 수정" on public.productions for update to authenticated
  using ((select public.is_team()) and public.is_year_open(year))
  with check ((select public.is_team()) and public.is_year_open(year));
create policy "팀 삭제" on public.productions for delete to authenticated
  using ((select public.is_team()) and public.is_year_open(year));

-- 과목
create policy "팀 추가" on public.subjects for insert to authenticated
  with check ((select public.is_team()));
create policy "팀 수정" on public.subjects for update to authenticated
  using ((select public.is_team()) and public.is_year_open(year))
  with check ((select public.is_team()) and public.is_year_open(year));
create policy "팀 삭제" on public.subjects for delete to authenticated
  using ((select public.is_team()) and public.is_year_open(year));

-- 비공개 정보
create policy "팀 추가" on public.subject_private for insert to authenticated
  with check ((select public.is_team()));
create policy "팀 수정" on public.subject_private for update to authenticated
  using ((select public.is_team())) with check ((select public.is_team()));
create policy "팀 삭제" on public.subject_private for delete to authenticated
  using ((select public.is_team()));

-- 제작 묶음에 딸린 표: 열린 연도만 쓰기
create policy "팀 쓰기" on public.session_plan for all to authenticated
  using ((select public.is_team()) and public.is_year_open(public.production_year(production_id)))
  with check ((select public.is_team()) and public.is_year_open(public.production_year(production_id)));
create policy "팀 쓰기" on public.session_status for all to authenticated
  using ((select public.is_team()) and public.is_year_open(public.production_year(production_id)))
  with check ((select public.is_team()) and public.is_year_open(public.production_year(production_id)));
create policy "팀 쓰기" on public.stage_checks for all to authenticated
  using ((select public.is_team()) and public.is_year_open(public.production_year(production_id)))
  with check ((select public.is_team()) and public.is_year_open(public.production_year(production_id)));
create policy "팀 쓰기" on public.notes for all to authenticated
  using ((select public.is_team()) and public.is_year_open(public.production_year(production_id)))
  with check ((select public.is_team()) and public.is_year_open(public.production_year(production_id)));
-- 작업 기록은 추가만(수정·삭제 없음)
create policy "팀 추가" on public.work_logs for insert to authenticated
  with check ((select public.is_team()) and public.is_year_open(public.production_year(production_id)));

-- 작업 입력 저장: 기록 한 줄 추가 + 차시 상태 갱신을 한 번에
create or replace function public.save_work(
  p_production_id bigint,
  p_stage text,
  p_done int[],
  p_cancel int[],
  p_workers text[],
  p_memo text
) returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
  v_id bigint;
begin
  insert into public.work_logs (production_id, stage, done_sessions, cancel_sessions, workers, memo)
  values (p_production_id, p_stage, coalesce(p_done, '{}'), coalesce(p_cancel, '{}'), coalesce(p_workers, '{}'), nullif(trim(p_memo), ''))
  returning id into v_id;

  insert into public.session_status (production_id, session_no, stage, done, done_at)
  select p_production_id, s, p_stage, true, now() from unnest(coalesce(p_done, '{}')) as s
  on conflict (production_id, session_no, stage) do update set done = true, done_at = excluded.done_at;

  update public.session_status
     set done = false, done_at = null
   where production_id = p_production_id and stage = p_stage
     and session_no = any (coalesce(p_cancel, '{}'));

  return v_id;
end;
$$;

revoke execute on function public.save_work(bigint, text, int[], int[], text[], text) from public, anon;
grant execute on function public.save_work(bigint, text, int[], int[], text[], text) to authenticated;
revoke execute on function public.is_team() from public;
grant execute on function public.is_team() to anon, authenticated;
