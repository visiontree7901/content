# 개발 메모 (화면 개발자용)

## 실행
- `npm run dev -- --port 5173` → http://localhost:5173/?mock=1 (가짜 데이터, `src/dev/fixture.json`, 깃에 안 올림)
- 가짜 데이터에서 팀 로그인 비밀번호: `test`. 가짜 데이터는 새로고침하면 처음 상태로 돌아감
- 화면 캡처: `BASE=http://localhost:5173 node scripts/shot.mjs "/?mock=1" /tmp/a.png 1440 1500 login` (마지막 login은 선택)
- `?mock=1`은 개발 서버에서만 작동, 배포본에는 가짜 데이터가 들어가지 않음
- 링크를 만들 때 `?mock=1`이 사라지지 않게 `withMock(path)` (src/lib/nav.js) 사용

## 화면 규칙
- 시안(Claude Design 아티팩트)의 .dc.html 파일이 기준: 레이아웃·문구·색을 그대로 옮김. 시안의 가짜 컨트롤(asOf, role 등 미리보기용 설정)은 옮기지 않음
- 글꼴 IBM Plex Sans KR, 색은 `src/lib/constants.js`의 `C`, `INSTITUTES`, `EVAL_STYLE`, `PART_COLORS`
- 교육원 표시는 진한 네모가 아니라 연한 배경 + 대표색 글씨(`InstBadge`)
- 반응형: 390px 폭에서 가로 스크롤 없이(표는 `.scroll-x` 안에서만 옆으로 밀기), 터치 대상 최소 40px
- 문구는 한국어, 존댓말 '~해요' 체(시안과 같게)
- 인라인 style 위주(시안과 같은 방식), 공통 CSS는 `src/styles.css`

## 공통 상태 `useApp()` (src/lib/AppContext.jsx)
- `year, setYear, isTeam, locked, canEdit(팀 로그인 + 열린 연도), canUpload(팀 로그인이면 잠긴 연도도 가능)`
- `model` (아래), `loading, error, reload()`
- `run(asyncFn, '저장했어요')` — 저장 실행 → 자동 다시 불러오기 → 알림. 실패 시 오류 알림 후 throw
- `notify(text, 'ok'|'error')`

## model (src/lib/model.js의 buildModel)
- `model.active` 삭제 안 된 과목(가나다순), `model.deleted` 삭제 표시된 과목, `model.subjectById`, `model.productions` (Map)
- subject: DB 칸 그대로(`id, year, institute 'V'|'K', name, professor, eval_type, prod_status, owner, location, dev_year, last_result, fail_reason, note, production_id, deleted_at, updated_at`)
  + `priv` (팀 로그인일 때만: `lecnum, web_folder_old, web_folder_new, cdn_folder_old, cdn_folder_new, phone, email`, 비로그인은 null)
  + `production`, `shared` (다른 교육원 코드 또는 null → `SharedTag other={s.shared}`), `partner` (다른 교육원 과목)
- production: `id, year, name, professor, total_sessions, is_practicum, kind('신규촬영'|'일부 수정'|'재사용'), subjects[], status{공정: Set(완료 차시)}, plan{차시: '재촬영'|'재편집'}, checks{항목: bool}, notes[] (최신순), logs[] (최신순)`
- 도움 함수: `stagesOf(p)`, `targetSessions(p, stage)`, `isDone(p, stage, n)`, `stageProgress(p, stage)` → {done,total}, `fullyDoneSessions(p)`, `isProductionComplete(p)`, `parseSessionList('2,3,5-7')`, `formatSessionList([..])`, `fmtDate(iso)` yy.mm.dd, `fmtDateTime`, `isTodayKST`
- 공통 과목은 비전·건국 과목 2개가 같은 production을 같이 씀 → 차시 진행·체크·메모·기록은 production 기준

## 저장 함수 (src/lib/api.js) — 꼭 `run(() => api.x(...), '알림')`으로 호출
- `createSubject({ year, institute, name, professor, eval_type, prod_status, owner, location, dev_year, last_result, fail_reason, note, lecnum, web_folder_new, cdn_folder_new, ..., phone, email, total_sessions, plan })` — 같은 연도·과목명·교수명이 다른 교육원에 있으면 자동으로 공통 연결
- `updateSubject(subject, patch)` — 과목 칸 + 비공개 칸 + total_sessions
- `deleteSubjects(ids)`, `restoreSubjects(ids)` (삭제 표시/복구)
- `setPlan(productionId, { 차시: '재촬영'|'재편집' })` — 일부 수정 차시 지정 전체 교체
- `saveWork({ productionId, stage, done:[차시], cancel:[차시], workers:[이름], memo })` — 작업 기록 1줄 + 차시 상태
- `setCheck(productionId, item, checked)` — 진행 단계 체크
- `addNote({ productionId, kind:'교수소통'|'작업메모', author, body, status })`, `updateNote(id, patch)`, `deleteNote(id)`
- `loadYearForCompare(year)` — 엑셀 업로드 중복 검사용(다른 연도 데이터)

## 공통 화면 조각 (src/components/ui.jsx)
`Icon(name)`(prev,next,down,download,upload,plus,edit,trash,lock,search,close,check,sort,filter,restore,arrow,user), `InstBadge`, `SharedTag`, `EvalChip`, `StatusChip`, `STATUS_SWATCH`, `Button(kind primary|secondary|danger|ghost, icon, small)`, `Card(title,right)`, `Modal(title,onClose,footer)`, `Field(label,required,hint)`, `inputStyle`, `PeoplePicker(value,onChange,multiple)`, `Loading`, `ErrorBox`

## 주소
- `/` 기관별 현황(`?inst=K` 건국 탭) · `/production` 통합 제작현황 · `/course?subject=ID` 과목 상세 · `/work?subject=ID` 작업 입력
- 과목은 이름이 아니라 subject id로 구분(같은 이름 과목이 여러 개일 수 있음)

## 미리보기(Claude 아티팩트)
- `npm run build:artifact` → `dist-artifact/` (시험용 데이터 `src/dev/fixture-preview.json` 내장, 비공개 칸은 비워 둠, # 주소 방식, 팀 로그인 상태로 시작, 비밀번호 test)
- 아티팩트로 올릴 때는 index.html의 doctype/html/head/body 껍데기를 빼고, assets/*.js·css·favicon.svg를 같이 올림. exceljs 파일의 U+FFFD 문자는 `�`로 바꿔야 올라감
- 반영 순서: 수정 → 아티팩트로 미리 확인 → 팀장 "반영해줘" → main에 push(Netlify 배포 1번 = 15 크레딧)
