// 개발 점검용 가짜 Supabase 클라이언트(배포본에는 포함되지 않음, ?mock=1 일 때만)
// 화면에서 쓰는 쿼리 모양만 흉내냄: select/eq/in/is/order/range, insert/update/delete/upsert, rpc('save_work')
import { isYearOpen } from './year.js';

const fixtures = import.meta.glob('../dev/fixture.json', { eager: true });

export async function createMockClient() {
  const fx = Object.values(fixtures)[0]?.default;
  if (!fx) throw new Error('src/dev/fixture.json 이 없습니다');
  const db = structuredClone(fx);
  for (const t of ['subjects', 'productions', 'subject_private', 'session_plan', 'session_status', 'work_logs', 'stage_checks', 'material_receipts', 'notes']) db[t] ||= [];
  const seq = {};
  const nextId = (t) => { seq[t] = (seq[t] ?? Math.max(0, ...db[t].map((r) => r.id || 0))) + 1; return seq[t]; };
  const keys = { subject_private: ['subject_id'], session_plan: ['production_id', 'session_no'], session_status: ['production_id', 'session_no', 'stage'], stage_checks: ['production_id', 'item'], material_receipts: ['production_id', 'item'] };
  let session = null;
  try { if (sessionStorage.getItem('mock-session')) session = { user: { email: 'team' } }; } catch { /* 무시 */ }
  const listeners = new Set();
  const now = () => new Date().toISOString();
  const prodYear = (pid) => db.productions.find((p) => p.id === pid)?.year;
  const deny = { data: null, error: { message: '권한이 없습니다(로그인 필요)' } };

  function canWrite(table, row, op) {
    if (!session) return false;
    if (table === 'subjects' || table === 'productions') return op === 'insert' || isYearOpen(row.year);
    if (table === 'session_plan' && op === 'insert') return true;
    if (table === 'subject_private') return true;
    return isYearOpen(prodYear(row.production_id));
  }

  function builder(table, op, payload, opts) {
    const filters = [];
    let order = null; let range = null; let returning = op === 'select';
    const api = {
      select() { returning = true; return api; },
      eq(c, v) { filters.push((r) => r[c] === v); return api; },
      in(c, arr) { const s = new Set(arr); filters.push((r) => s.has(r[c])); return api; },
      is(c, v) { filters.push((r) => (r[c] ?? null) === v); return api; },
      order(c) { order = c; return api; },
      range(a, b) { range = [a, b]; return api; },
      then(res, rej) { return Promise.resolve().then(run).then(res, rej); },
    };
    const match = (r) => filters.every((f) => f(r));
    function run() {
      const rows = db[table];
      if (op === 'select') {
        if (table === 'subject_private' && !session) return { data: [], error: null };
        let out = rows.filter(match);
        if (order) out = [...out].sort((a, b) => (a[order] > b[order] ? 1 : a[order] < b[order] ? -1 : 0));
        if (range) out = out.slice(range[0], range[1] + 1);
        return { data: structuredClone(out), error: null };
      }
      if (op === 'insert' || op === 'upsert') {
        const list = Array.isArray(payload) ? payload : [payload];
        const out = [];
        for (const item of list) {
          const row = { ...item };
          if (!canWrite(table, row, 'insert')) return deny;
          const k = keys[table];
          const existing = op === 'upsert' && k ? rows.find((r) => k.every((c) => r[c] === row[c])) : null;
          if (existing) { Object.assign(existing, row); out.push(existing); continue; }
          if (!k || table === 'session_status') { /* id 없음 */ }
          if (['subjects', 'productions', 'work_logs', 'notes'].includes(table)) row.id = nextId(table);
          row.created_at ||= now();
          if (table === 'subjects' || table === 'notes') row.updated_at = now();
          if (table === 'subjects') row.deleted_at ??= null;
          rows.push(row); out.push(row);
        }
        return { data: returning ? structuredClone(out) : null, error: null };
      }
      if (op === 'update') {
        const hit = rows.filter(match);
        for (const r of hit) if (!canWrite(table, r, 'update')) return deny;
        for (const r of hit) { Object.assign(r, payload); if ('updated_at' in r) r.updated_at = now(); }
        return { data: returning ? structuredClone(hit) : null, error: null };
      }
      if (op === 'delete') {
        const hit = rows.filter(match);
        for (const r of hit) if (!canWrite(table, r, 'delete')) return deny;
        db[table] = rows.filter((r) => !match(r));
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'mock: 지원하지 않는 동작' } };
    }
    return api;
  }

  return {
    from(table) {
      return {
        select: () => builder(table, 'select'),
        insert: (rows) => builder(table, 'insert', rows),
        upsert: (rows, opts) => builder(table, 'upsert', rows, opts),
        update: (patch) => builder(table, 'update', patch),
        delete: () => builder(table, 'delete'),
      };
    },
    async rpc(name, a) {
      if (name !== 'save_work') return { data: null, error: { message: 'mock: 없는 함수' } };
      if (!session || !isYearOpen(prodYear(a.p_production_id))) return deny;
      const id = nextId('work_logs');
      db.work_logs.push({ id, production_id: a.p_production_id, stage: a.p_stage, done_sessions: a.p_done, cancel_sessions: a.p_cancel, workers: a.p_workers, memo: a.p_memo?.trim() || null, created_at: now() });
      for (const n of a.p_done) {
        const r = db.session_status.find((x) => x.production_id === a.p_production_id && x.session_no === n && x.stage === a.p_stage);
        if (r) { r.done = true; r.done_at = now(); } else db.session_status.push({ production_id: a.p_production_id, session_no: n, stage: a.p_stage, done: true, done_at: now() });
      }
      for (const r of db.session_status) {
        if (r.production_id === a.p_production_id && r.stage === a.p_stage && a.p_cancel.includes(r.session_no)) { r.done = false; r.done_at = null; }
      }
      return { data: id, error: null };
    },
    auth: {
      async getSession() { return { data: { session } }; },
      onAuthStateChange(cb) { listeners.add(cb); return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }; },
      async signInWithPassword({ password }) {
        if (password !== 'test') return { error: { message: 'bad' } };
        session = { user: { email: 'team' } };
        try { sessionStorage.setItem('mock-session', '1'); } catch { /* 무시 */ }
        listeners.forEach((cb) => cb('SIGNED_IN', session));
        return { error: null };
      },
      async signOut() {
        session = null;
        try { sessionStorage.removeItem('mock-session'); } catch { /* 무시 */ }
        listeners.forEach((cb) => cb('SIGNED_OUT', null));
        return { error: null };
      },
    },
  };
}
