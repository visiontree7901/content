-- 엑셀 업로드로 잠긴 지난 연도 과목을 넣을 때 수정 차시 지정도 함께 들어가도록:
-- session_plan 추가는 팀이면 연도와 관계없이 허용 (기존 "팀 쓰기" 정책과 OR로 합쳐짐, 수정·삭제는 여전히 열린 연도만)
create policy "팀 추가(잠긴 연도 포함)" on public.session_plan for insert to authenticated
  with check ((select private.is_team()));
