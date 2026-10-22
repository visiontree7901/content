// DB 읽기·쓰기 함수 모음. 화면은 이 함수들만 사용
import { getClient } from './supabase.js';
import { DEFAULT_SESSIONS } from './constants.js';

const PAGE = 1000;

function check({ data, error }) {
  if (error) throw new Error(error.message || '저장 중 오류가 났습니다');
  return data;
}

async function fetchAll(build) {
  let out = [];
  for (let from = 0; ; from += PAGE) {
    const rows = check(await build().range(from, from + PAGE - 1));
    out = out.concat(rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

/** 한 해 데이터 전체. team=true면 비공개 정보도 함께 */
export async function loadYear(year, team) {
  const sb = await getClient();
  const [subjects, productions] = await Promise.all([
    fetchAll(() => sb.from('subjects').select('*').eq('year', year).order('id')),
    fetchAll(() => sb.from('productions').select('*').eq('year', year).order('id')),
  ]);
  const pids = productions.map((p) => p.id);
  const sids = subjects.map((s) => s.id);
  if (!pids.length) {
    return { year, subjects, productions, privates: [], status: [], plan: [], checks: [], notes: [], logs: [] };
  }
  const byP = (t) => fetchAll(() => sb.from(t).select('*').in('production_id', pids).order('production_id'));
  const [status, plan, checks, notes, logs, privates] = await Promise.all([
    byP('session_status'),
    byP('session_plan'),
    byP('stage_checks'),
    byP('notes'),
    byP('work_logs'),
    team && sids.length
      ? fetchAll(() => sb.from('subject_private').select('*').in('subject_id', sids).order('subject_id'))
      : Promise.resolve([]),
  ]);
  return { year, subjects, productions, privates, status, plan, checks, notes, logs };
}

/** 과목 정보 칸(subjects 표) */
export const SUBJECT_FIELDS = ['name', 'professor', 'eval_type', 'prod_status', 'owner', 'location', 'dev_year', 'last_result', 'fail_reason', 'note'];
/** 비공개 칸(subject_private 표) */
export const PRIVATE_FIELDS = ['lecnum', 'web_folder_old', 'web_folder_new', 'cdn_folder_old', 'cdn_folder_new', 'phone', 'email'];

const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k] === '' ? null : obj[k];
  return out;
};

/**
 * 과목 추가. 같은 연도에 과목명+교수명이 같은 과목이 다른 교육원에 있으면 같은 제작 묶음에 연결(공통 과목)
 * input = { year, institute, ...SUBJECT_FIELDS, ...PRIVATE_FIELDS, total_sessions, plan: {n: '재촬영'|'재편집'} }
 * 반환: 새 과목 id
 */
export async function createSubject(input) {
  const sb = await getClient();
  const year = Number(input.year);
  const total = Number(input.total_sessions) || DEFAULT_SESSIONS;
  // 연결할 제작 묶음 찾기
  const sameRows = check(await sb.from('subjects').select('id,institute,production_id,deleted_at')
    .eq('year', year).eq('name', input.name).eq('professor', input.professor || ''));
  const partner = sameRows.find((r) => r.institute !== input.institute && !r.deleted_at);
  let productionId = partner?.production_id;
  if (productionId) {
    const taken = sameRows.some((r) => r.production_id === productionId && r.institute === input.institute && !r.deleted_at);
    if (taken) productionId = null;
  }
  if (!productionId) {
    const created = check(await sb.from('productions').insert({
      year, name: input.name, professor: input.professor || null,
      total_sessions: total, is_practicum: /실습/.test(input.name || ''),
    }).select('id'));
    productionId = created[0].id;
    const plan = input.plan || {};
    const rows = Object.entries(plan).map(([n, method]) => ({ production_id: productionId, session_no: Number(n), method }));
    if (rows.length) check(await sb.from('session_plan').insert(rows));
  }
  const subj = check(await sb.from('subjects').insert({
    year, institute: input.institute, production_id: productionId, ...pick(input, SUBJECT_FIELDS),
  }).select('id'));
  const sid = subj[0].id;
  const priv = pick(input, PRIVATE_FIELDS);
  check(await sb.from('subject_private').insert({ subject_id: sid, ...priv }));
  return sid;
}

/** 과목 수정. patch = SUBJECT_FIELDS / PRIVATE_FIELDS / total_sessions 중 바뀐 것 */
export async function updateSubject(subject, patch) {
  const sb = await getClient();
  const sf = pick(patch, SUBJECT_FIELDS);
  if (Object.keys(sf).length) check(await sb.from('subjects').update(sf).eq('id', subject.id));
  const pf = pick(patch, PRIVATE_FIELDS);
  if (Object.keys(pf).length) {
    check(await sb.from('subject_private').upsert({ subject_id: subject.id, ...pf }, { onConflict: 'subject_id' }));
  }
  const prodPatch = {};
  if (patch.total_sessions) prodPatch.total_sessions = Number(patch.total_sessions);
  // 공통 과목이 아니면 제작 묶음 이름·교수도 같이 맞춤
  const solo = (subject.production?.subjects || []).filter((s) => !s.deleted_at).length <= 1;
  if (solo && sf.name) prodPatch.name = sf.name;
  if (solo && sf.professor !== undefined) prodPatch.professor = sf.professor;
  if (Object.keys(prodPatch).length) check(await sb.from('productions').update(prodPatch).eq('id', subject.production_id));
}

export async function deleteSubjects(ids) {
  const sb = await getClient();
  check(await sb.from('subjects').update({ deleted_at: new Date().toISOString() }).in('id', ids));
}
export async function restoreSubjects(ids) {
  const sb = await getClient();
  check(await sb.from('subjects').update({ deleted_at: null }).in('id', ids));
}

/** 일부 수정 차시 지정 전체 교체. plan = { n: '재촬영'|'재편집' } */
export async function setPlan(productionId, plan) {
  const sb = await getClient();
  check(await sb.from('session_plan').delete().eq('production_id', productionId));
  const rows = Object.entries(plan).map(([n, method]) => ({ production_id: productionId, session_no: Number(n), method }));
  if (rows.length) check(await sb.from('session_plan').insert(rows));
}

/** 작업 입력 저장(기록 + 차시 상태) */
export async function saveWork({ productionId, stage, done = [], cancel = [], workers = [], memo = '' }) {
  const sb = await getClient();
  return check(await sb.rpc('save_work', {
    p_production_id: productionId, p_stage: stage, p_done: done, p_cancel: cancel, p_workers: workers, p_memo: memo,
  }));
}

export async function setCheck(productionId, item, checked) {
  const sb = await getClient();
  check(await sb.from('stage_checks').upsert({
    production_id: productionId, item, checked, checked_at: checked ? new Date().toISOString() : null,
  }, { onConflict: 'production_id,item' }));
}

/** 메모 추가. kind = '교수소통' | '작업메모' */
export async function addNote({ productionId, kind, author, body, status = null }) {
  const sb = await getClient();
  check(await sb.from('notes').insert({ production_id: productionId, kind, author: author || null, body, status }));
}
export async function updateNote(id, patch) {
  const sb = await getClient();
  check(await sb.from('notes').update(patch).eq('id', id));
}
export async function deleteNote(id) {
  const sb = await getClient();
  check(await sb.from('notes').delete().eq('id', id));
}

/** 다른 연도에 과목이 있는지(엑셀 업로드 중복 검사용) — 해당 연도 과목 + 비공개 정보 */
export async function loadYearForCompare(year) {
  const sb = await getClient();
  const subjects = await fetchAll(() => sb.from('subjects').select('*').eq('year', year).is('deleted_at', null).order('id'));
  const prods = await fetchAll(() => sb.from('productions').select('id,total_sessions').eq('year', year).order('id'));
  const sids = subjects.map((s) => s.id);
  const privates = sids.length
    ? await fetchAll(() => sb.from('subject_private').select('*').in('subject_id', sids).order('subject_id'))
    : [];
  return { subjects, prods, privates };
}
