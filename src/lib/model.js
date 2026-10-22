// DB에서 받은 표들을 화면에서 쓰기 좋은 모양으로 묶음
import { DEFAULT_SESSIONS, NEW_STAGES, PART_STAGES, PROD_RANK, RECEIPT_ITEMS } from './constants.js';

const collator = new Intl.Collator('ko');
export const byName = (a, b) => collator.compare(a.name, b.name);

/**
 * raw = { year, subjects, productions, privates, status, plan, checks, notes, logs }
 * 반환 model = {
 *   year,
 *   subjects: [subject] (삭제 표시 포함, 가나다순),
 *   active: [subject] (삭제 안 된 것),
 *   deleted: [subject],
 *   productions: Map(id → production),
 *   subjectById: Map(id → subject),
 * }
 * subject = DB 행 + { priv, production, shared: 'V'|'K'|null (다른 교육원 공통 여부), partner }
 * production = DB 행 + {
 *   subjects: [subject], kind: '신규촬영'|'일부 수정'|'재사용'|'타기관 임대',
 *   status: { [stage]: Set(session_no) }   // 완료된 차시
 *   plan: { [session_no]: '재촬영'|'재편집' },
 *   checks: { [item]: boolean },
 *   notes: [note] (최신순), logs: [log] (최신순)
 * }
 */
export function buildModel(raw) {
  const productions = new Map();
  for (const p of raw.productions) {
    productions.set(p.id, {
      ...p,
      total_sessions: p.total_sessions || DEFAULT_SESSIONS,
      subjects: [],
      kind: '재사용',
      status: {},
      plan: {},
      checks: {},
      receipts: {},   // 타기관 임대: { 자료: received_at(ISO) | null(받음, 날짜 없음) } — 받은 것만
      notes: [],
      logs: [],
    });
  }
  const privBy = new Map((raw.privates || []).map((r) => [r.subject_id, r]));
  const subjects = raw.subjects.map((s) => ({ ...s, priv: privBy.get(s.id) || null }));
  const subjectById = new Map(subjects.map((s) => [s.id, s]));

  for (const s of subjects) {
    const p = productions.get(s.production_id);
    s.production = p || null;
    if (p) p.subjects.push(s);
  }
  for (const p of productions.values()) {
    const live = p.subjects.filter((s) => !s.deleted_at);
    let best = '재사용';
    for (const s of live) if (PROD_RANK[s.prod_status] > PROD_RANK[best]) best = s.prod_status;
    p.kind = best;
    for (const s of p.subjects) {
      const other = live.find((o) => o.id !== s.id && o.institute !== s.institute);
      s.partner = other || null;
      s.shared = other ? other.institute : null;
    }
  }
  for (const r of raw.status || []) {
    if (!r.done) continue;
    const p = productions.get(r.production_id);
    if (!p) continue;
    (p.status[r.stage] ||= new Set()).add(r.session_no);
  }
  for (const r of raw.plan || []) {
    const p = productions.get(r.production_id);
    if (p) p.plan[r.session_no] = r.method;
  }
  for (const r of raw.receipts || []) {
    const p = productions.get(r.production_id);
    if (p && r.received) p.receipts[r.item] = r.received_at || null;
  }
  for (const r of raw.checks || []) {
    const p = productions.get(r.production_id);
    if (p) p.checks[r.item] = !!r.checked;
  }
  const desc = (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id);
  for (const n of raw.notes || []) productions.get(n.production_id)?.notes.push(n);
  for (const l of raw.logs || []) productions.get(l.production_id)?.logs.push(l);
  for (const p of productions.values()) { p.notes.sort(desc); p.logs.sort(desc); }

  subjects.sort(byName);
  return {
    year: raw.year,
    subjects,
    active: subjects.filter((s) => !s.deleted_at),
    deleted: subjects.filter((s) => s.deleted_at),
    productions,
    subjectById,
  };
}

/** 타기관 임대: 받은 자료 수 */
export function receiptProgress(p) {
  const done = RECEIPT_ITEMS.filter((it) => it in (p?.receipts || {})).length;
  return { done, total: RECEIPT_ITEMS.length };
}

/** 공정 목록: 신규촬영 → 6개, 일부 수정 → 3개, 재사용·타기관 임대 → [] */
export function stagesOf(p) {
  if (!p) return [];
  if (p.kind === '신규촬영') return NEW_STAGES;
  if (p.kind === '일부 수정') return PART_STAGES;
  return [];
}

/** 일부 수정에서 공정별 대상 차시: 재촬영/재편집은 지정된 차시, 자막은 지정된 모든 차시 */
export function targetSessions(p, stage) {
  const all = Array.from({ length: p.total_sessions }, (_, i) => i + 1);
  if (p.kind !== '일부 수정') return all;
  const planned = Object.keys(p.plan).map(Number).sort((a, b) => a - b);
  if (stage === '자막') return planned;
  return planned.filter((n) => p.plan[n] === stage);
}

export function isDone(p, stage, n) {
  return !!p.status[stage]?.has(n);
}

/** 공정별 진행: { done, total } (대상 차시 기준) */
export function stageProgress(p, stage) {
  const targets = targetSessions(p, stage);
  let done = 0;
  for (const n of targets) if (isDone(p, stage, n)) done++;
  return { done, total: targets.length };
}

/** 모든 공정이 끝난 차시 수(신규촬영 카드의 '완료 차시') */
export function fullyDoneSessions(p) {
  const stages = stagesOf(p);
  if (!stages.length) return 0;
  let count = 0;
  for (let n = 1; n <= p.total_sessions; n++) if (stages.every((st) => isDone(p, st, n))) count++;
  return count;
}

export function isProductionComplete(p) {
  const stages = stagesOf(p);
  if (!stages.length) return false;
  if (p.kind === '일부 수정') {
    const planned = Object.keys(p.plan).length;
    if (!planned) return false;
    return stages.every((st) => { const r = stageProgress(p, st); return r.done === r.total; });
  }
  return fullyDoneSessions(p) === p.total_sessions;
}

/** '2,3,5-7' → [2,3,5,6,7] */
export function parseSessionList(text, max = 60) {
  if (text == null) return [];
  const out = new Set();
  for (const part of String(text).split(/[,\s/]+/)) {
    if (!part) continue;
    const m = part.match(/^(\d+)\s*[-~]\s*(\d+)$/);
    if (m) {
      const a = Number(m[1]); const b = Number(m[2]);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= max) out.add(i);
    } else if (/^\d+$/.test(part)) {
      const n = Number(part); if (n >= 1 && n <= max) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

/** [2,3,5,6,7] → '2,3,5-7' */
export function formatSessionList(list) {
  const s = [...list].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i;
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(j > i + 1 ? `${s[i]}-${s[j]}` : j === i + 1 ? `${s[i]},${s[j]}` : `${s[i]}`);
    i = j;
  }
  return out.join(',');
}

/** 날짜 표시 yy.mm.dd (한국 시간) */
export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g('year')}.${g('month')}.${g('day')}`;
}
export function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t) => p.find((x) => x.type === t)?.value;
  return `${g('month')}.${g('day')} ${g('hour')}:${g('minute')}`;
}
export function isTodayKST(iso) {
  if (!iso) return false;
  const f = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
  return f(new Date(iso)) === f(new Date());
}
