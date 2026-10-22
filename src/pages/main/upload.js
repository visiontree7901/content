// 엑셀 업로드: 줄 검사 + 기존 과목과 비교 (화면 없는 계산만)
import { EVAL_TYPES, PROD_STATUSES } from '../../lib/constants.js';
import { formatSessionList, parseSessionList } from '../../lib/model.js';

const INST_IN = { 비전: 'V', 건국: 'K', V: 'V', K: 'K', 비전원격평생교육원: 'V', 건국사이버평생교육원: 'K' };
const STATUS_IN = Object.fromEntries(PROD_STATUSES.map((s) => [s.replace(/\s/g, ''), s]));

const str = (v) => (v === null || v === undefined ? '' : typeof v === 'number' ? String(v) : String(v).trim());

/** 엑셀 1줄 → { data, errors } */
export function validateRow(cells) {
  const errors = [];
  const yearText = str(cells['연도']);
  const year = Number(yearText);
  if (!yearText) errors.push('연도가 비어 있어요');
  else if (!Number.isInteger(year) || year < 2000 || year > 2100) errors.push('연도는 2027처럼 숫자 4자리로 적어요');

  const instText = str(cells['교육원']);
  const institute = INST_IN[instText] || null;
  if (!instText) errors.push('교육원이 비어 있어요');
  else if (!institute) errors.push("교육원은 '비전' 또는 '건국'이에요");

  const name = str(cells['과목명']);
  if (!name) errors.push('과목명이 비어 있어요');
  const professor = str(cells['교수명']);
  if (!professor) errors.push('교수명이 비어 있어요');

  const evalType = str(cells['평가 구분']);
  if (!evalType) errors.push('평가 구분이 비어 있어요');
  else if (!EVAL_TYPES.includes(evalType)) errors.push("평가 구분은 '신규' 또는 '재평가'예요");

  const statusText = str(cells['제작 상태']);
  const prodStatus = STATUS_IN[statusText.replace(/\s/g, '')] || null;
  if (!statusText) errors.push('제작 상태가 비어 있어요');
  else if (!prodStatus) errors.push('제작 상태 값이 맞지 않아요(신규촬영·일부 수정·재사용)');

  const sesText = str(cells['총 차시']);
  const total = Number(sesText);
  if (!sesText) errors.push('총 차시가 비어 있어요');
  else if (!Number.isInteger(total) || total < 1 || total > 40) errors.push('총 차시는 1~40 사이 숫자예요');

  const reText = str(cells['재촬영 차시']);
  const edText = str(cells['재편집 차시']);
  const plan = {};
  if (prodStatus === '일부 수정' && Number.isInteger(total) && total >= 1 && total <= 40) {
    const re = parseSessionList(reText, 999);
    const ed = parseSessionList(edText, 999);
    if (re.some((n) => n > total) || ed.some((n) => n > total)) errors.push('수정 차시가 총 차시보다 커요');
    if (re.some((n) => ed.includes(n))) errors.push('같은 차시가 재촬영·재편집에 모두 있어요');
    for (const n of re) if (n <= total) plan[n] = '재촬영';
    for (const n of ed) if (n <= total && !plan[n]) plan[n] = '재편집';
  }

  const data = {
    year, institute, name, professor, eval_type: evalType, prod_status: prodStatus, total_sessions: total,
    owner: str(cells['소유자']), location: str(cells['촬영지']), dev_year: str(cells['개발년도']),
    last_result: str(cells['최근 평가 결과']), fail_reason: str(cells['탈락 사유']), note: str(cells['비고']),
    lecnum: str(cells['렉넘']), web_folder_new: str(cells['웹 폴더']), cdn_folder_new: str(cells['CDN 폴더']),
    phone: str(cells['휴대폰']), email: str(cells['이메일']),
    plan,
  };
  return { data, errors };
}

/** 예시 행(비고가 '예시 행'으로 시작) */
export const isExampleRow = (cells) => str(cells['비고']).startsWith('예시 행');

const planKey = (plan) => formatSessionList(Object.keys(plan).map(Number).filter((n) => plan[n] === '재촬영'))
  + '/' + formatSessionList(Object.keys(plan).map(Number).filter((n) => plan[n] === '재편집'));

function fingerprint(d) {
  return JSON.stringify([
    d.name, d.professor, d.eval_type, d.prod_status, Number(d.total_sessions) || 0,
    d.owner, d.location, d.dev_year, d.last_result, d.fail_reason, d.note,
    d.lecnum, d.web, d.cdn, d.phone, d.email,
    d.prod_status === '일부 수정' ? planKey(d.plan || {}) : '',
  ].map((v) => (typeof v === 'number' ? v : str(v))));
}

/** 이미 있는 과목(model subject) → 비교용 모양 */
function subjectShape(s) {
  const pv = s.priv || {};
  return {
    name: s.name, professor: s.professor, eval_type: s.eval_type, prod_status: s.prod_status,
    total_sessions: s.production?.total_sessions, owner: s.owner, location: s.location, dev_year: s.dev_year,
    last_result: s.last_result, fail_reason: s.fail_reason, note: s.note,
    lecnum: pv.lecnum, web: pv.web_folder_new || pv.web_folder_old, cdn: pv.cdn_folder_new || pv.cdn_folder_old,
    phone: pv.phone, email: pv.email, plan: s.production?.plan || {},
  };
}
const rowShape = (d) => ({ ...d, web: d.web_folder_new, cdn: d.cdn_folder_new });

/**
 * 줄마다 결과 정하기
 * getSubjects(year) → Promise<[subject]> (그 연도의 삭제 안 된 과목, model 모양)
 * isYearOpen(year) → 수정 가능한 연도인지
 * 반환 [{ rowNo, data, kind: 'new'|'same'|'dup'|'filedup'|'err', errors }]
 */
export async function analyzeRows(rows, getSubjects, { isYearOpen = () => true } = {}) {
  const out = [];
  const seen = new Set();
  const cache = new Map();
  for (const { rowNo, cells } of rows) {
    if (isExampleRow(cells)) continue;
    const { data, errors } = validateRow(cells);
    if (errors.length) { out.push({ rowNo, data, kind: 'err', errors }); continue; }
    if (!cache.has(data.year)) cache.set(data.year, await getSubjects(data.year));
    const base = cache.get(data.year).filter((s) => s.institute === data.institute);
    const fp = fingerprint(rowShape(data));
    const fileKey = `${data.year}|${data.institute}|${fp}`;
    let kind = 'new';
    if (base.some((s) => fingerprint(subjectShape(s)) === fp)) kind = 'dup';
    else if (seen.has(fileKey)) kind = 'filedup';
    else if (base.some((s) => s.name === data.name)) kind = 'same';
    if (kind === 'new' || kind === 'same') seen.add(fileKey);
    out.push({ rowNo, data, kind, errors });
  }
  return out;
}

/** 줄 결과 → createSubject 입력 */
export function toCreateInput(d) {
  const nz = (v) => (v === '' ? null : v);
  return {
    year: d.year, institute: d.institute, name: d.name, professor: d.professor,
    eval_type: d.eval_type, prod_status: d.prod_status,
    owner: nz(d.owner), location: nz(d.location), dev_year: nz(d.dev_year), last_result: nz(d.last_result),
    fail_reason: nz(d.fail_reason), note: nz(d.note),
    lecnum: nz(d.lecnum), web_folder_new: nz(d.web_folder_new), cdn_folder_new: nz(d.cdn_folder_new),
    phone: nz(d.phone), email: nz(d.email),
    total_sessions: d.total_sessions,
    plan: d.prod_status === '일부 수정' ? d.plan : {},
  };
}
