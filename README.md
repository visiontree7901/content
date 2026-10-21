# 평가인정 과목 관리 대시보드

비전트리 콘텐츠개발팀의 학점은행제 평가인정 과목(비전원격평생교육원 · 건국사이버평생교육원) 제작 현황 대시보드.

- 호스팅: Netlify
- DB: Supabase (`supabase/migrations`에 테이블 구조)

## DB 구조 요약
- `subjects` — 연도 × 교육원 × 과목 (누구나 보기)
- `subject_private` — 렉넘, 웹·CDN 폴더, 연락처 (팀 로그인만)
- `productions` — 제작 묶음. 비전·건국 공통 과목은 하나를 같이 씀
- `session_plan` — 일부 수정 차시(재촬영/재편집)
- `session_status` — 차시 × 공정 완료 여부
- `work_logs` — 작업 기록(추가만, 완료 취소도 기록으로 남김)
- `stage_checks` — 진행 단계 체크 6개
- `notes` — 교수 소통 내용 · 작업 메모

쓰기는 `team_members`에 등록된 팀 공용 계정만 가능. 지난 연도는 다음 해 2월 말 이후 잠금(과목 추가는 허용).
