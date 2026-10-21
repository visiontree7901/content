-- 권한 확인용 보조 함수를 API에 노출되지 않는 private 스키마로 이동 (보안 점검 권고 반영)
create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_team() set schema private;
alter function public.production_year(bigint) set schema private;

revoke execute on function private.is_team() from public;
revoke execute on function private.production_year(bigint) from public;
grant execute on function private.is_team() to anon, authenticated;
grant execute on function private.production_year(bigint) to anon, authenticated;
