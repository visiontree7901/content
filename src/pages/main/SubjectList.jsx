// 과목 목록: 검색 · 열 정렬 · 열 값 필터 · 체크 · 제작 진행 막대
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { C, PART_COLORS } from '../../lib/constants.js';
import { isDone, stageProgress } from '../../lib/model.js';
import { courseUrl } from '../../lib/nav.js';
import { EvalChip, Icon, SharedTag, StatusChip } from '../../components/ui.jsx';

const STATUS_ORDER = { 신규촬영: 0, '일부 수정': 1, 재사용: 2 };
const collator = new Intl.Collator('ko', { numeric: true });

/** 일부 수정 과목의 공정별 진행(지정된 차시 기준) */
function partBars(p) {
  const planned = Object.keys(p?.plan || {}).map(Number);
  return ['재촬영', '재편집', '자막'].map((stage) => {
    const targets = stage === '자막' ? planned : planned.filter((n) => p.plan[n] === stage);
    const done = targets.filter((n) => isDone(p, stage, n)).length;
    return { stage, done, total: targets.length };
  });
}

function progressValue(s) {
  const p = s.production;
  if (!p || s.prod_status === '재사용') return -1;
  if (s.prod_status === '일부 수정') {
    const bars = partBars(p);
    const t = bars.reduce((a, b) => a + b.total, 0);
    return t ? bars.reduce((a, b) => a + b.done, 0) / t : -0.5;
  }
  const r = stageProgress(p, '촬영');
  return r.total ? r.done / r.total : 0;
}

function Bar({ label, done, total, color, labelWidth }) {
  const none = total === 0;
  const pct = none ? 100 : Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{ width: labelWidth, color: C.muted, flex: 'none' }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: '#E9ECF0', borderRadius: 3, overflow: 'hidden' }}
        role="img" aria-label={none ? `${label} 해당없음` : `${label} ${done}/${total}`}>
        <div style={{ height: 6, width: `${pct}%`, background: none ? C.line2 : color }} />
      </div>
      <span style={{ width: labelWidth === 28 ? 40 : 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums', flex: 'none', ...(none ? { color: C.subtle, fontSize: 11 } : null) }}>
        {none ? '해당없음' : `${done}/${total}`}
      </span>
    </div>
  );
}

function Progress({ s }) {
  const p = s.production;
  if (s.prod_status === '재사용' || !p) return <span style={{ fontSize: 12, color: C.subtle }}>{s.prod_status === '신규촬영' ? '제작현황 등록 필요' : '—'}</span>;
  if (s.prod_status === '일부 수정') {
    if (!Object.keys(p.plan || {}).length) return <span style={{ fontSize: 12, color: '#8A3806' }}>수정 차시 미지정</span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {partBars(p).map((b) => <Bar key={b.stage} label={b.stage} done={b.done} total={b.total} color={PART_COLORS[b.stage]} labelWidth={40} />)}
      </div>
    );
  }
  const shoot = stageProgress(p, '촬영');
  const edit = stageProgress(p, '편집');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Bar label="촬영" done={shoot.done} total={shoot.total} color="#1F4FBF" labelWidth={28} />
      <Bar label="편집" done={edit.done} total={edit.total} color="#6E8FDB" labelWidth={28} />
    </div>
  );
}

const COLS = [
  { id: 'no', label: 'No', val: (x) => x.origNo },
  { id: 'name', label: '과목명', val: (x) => x.s.name },
  { id: 'prof', label: '교수', val: (x) => x.s.professor || '' },
  { id: 'type', label: '평가 구분', val: (x) => x.s.eval_type || '', filter: true },
  { id: 'status', label: '제작 상태', val: (x) => STATUS_ORDER[x.s.prod_status] ?? 9, fval: (x) => x.s.prod_status || '(없음)', filter: true },
  { id: 'owner', label: '소유자', val: (x) => x.s.owner || '', fval: (x) => x.s.owner || '(없음)', filter: true },
  { id: 'dev', label: '개발년도', val: (x) => x.s.dev_year || '', fval: (x) => x.s.dev_year || '(없음)', filter: true },
  { id: 'last', label: '최근 결과', val: (x) => x.s.last_result || '', fval: (x) => x.s.last_result || '(없음)', filter: true },
  { id: 'prog', label: '제작 진행', val: (x) => x.prog },
];
const fv = (c, x) => String(c.fval ? c.fval(x) : c.val(x));
const GRID_EDIT = '40px 44px minmax(220px, 2.2fr) 90px 106px 124px 104px 104px 128px 230px';
const GRID_VIEW = '44px minmax(220px, 2.2fr) 90px 106px 124px 104px 104px 128px 230px';

/** 열 값 필터 창: 화면 기준 위치(fixed)라 목록 칸에 잘리지 않음 */
function FilterPopover({ anchor, col, values, counts, sel, onSet, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const nValues = values.length;
  useLayoutEffect(() => {
    const place = () => {
      const el = anchor();
      if (!el) return;
      const r = el.getBoundingClientRect();
      const w = 220;
      const vw = window.innerWidth; const vh = window.innerHeight;
      let left = col.right ? r.right - w : r.left;
      left = Math.max(8, Math.min(left, vw - w - 8));
      const below = vh - r.bottom - 8;
      const above = r.top - 8;
      const need = Math.min(340, 110 + 36 * nValues);
      if (below >= need || below >= above) setPos({ left, top: r.bottom + 4, maxH: Math.max(160, below - 4) });
      else setPos({ left, bottom: vh - r.top + 4, maxH: Math.max(160, above - 4) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, col.right, nValues]);
  useEffect(() => {
    const onDown = (e) => {
      const a = anchor();
      if (ref.current?.contains(e.target) || a?.contains(e.target)) return;
      onClose();
    };
    const onKey = (e) => { if (e.key === 'Escape') { onClose(); anchor()?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [anchor, onClose]);
  if (!pos) return null;
  const toggle = (v) => {
    const cur = sel ? [...sel] : [...values];
    const k = cur.indexOf(v);
    if (k > -1) cur.splice(k, 1); else cur.push(v);
    onSet(cur);
  };
  return (
    <div ref={ref} role="dialog" aria-label={`${col.label} 필터`}
      style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, zIndex: 40, width: 220, maxHeight: pos.maxH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', background: '#fff', border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: '0 8px 24px rgba(21, 24, 29, 0.16)', padding: 10, fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 0 6px 4px' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, flex: 1 }}>{col.label} 필터</span>
        <button type="button" onClick={onClose} aria-label="필터 닫기" style={{ width: 32, height: 32, border: 0, background: 'transparent', borderRadius: 6, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
          <Icon name="close" />
        </button>
      </div>
      <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {values.map((v) => (
          <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 36, padding: '0 4px', fontSize: 13, color: C.ink, cursor: 'pointer', borderRadius: 4 }}>
            <input type="checkbox" checked={!sel || sel.includes(v)} onChange={() => toggle(v)} style={{ width: 16, height: 16, accentColor: C.primary, cursor: 'pointer', margin: 0 }} />
            <span style={{ flex: 1 }}>{v}</span>
            <span style={{ color: C.subtle, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{counts[v]}</span>
          </label>
        ))}
        {!values.length && <span style={{ color: C.subtle, padding: 4 }}>값이 없어요</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, borderTop: '1px solid #EEF0F3', paddingTop: 8, marginTop: 4 }}>
        <button type="button" onClick={() => onSet(null)} style={{ flex: 1, height: 34, border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>전체 선택</button>
        <button type="button" onClick={() => onSet([])} style={{ flex: 1, height: 34, border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 6, fontFamily: 'inherit', fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
      </div>
    </div>
  );
}

export default function SubjectList({ subjects, title, cardFiltered, onClearCard, canEdit, checked, setChecked }) {
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState(0);
  const [colFilter, setColFilter] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const btnRefs = useRef({});

  const base = useMemo(() => subjects.map((s, i) => ({ s, origNo: i + 1, prog: progressValue(s) })), [subjects]);
  const ql = q.trim().toLowerCase();
  const rowsQ = useMemo(() => base.filter((x) => !ql || x.s.name.toLowerCase().includes(ql) || (x.s.professor || '').toLowerCase().includes(ql)), [base, ql]);
  const rows = useMemo(() => {
    let out = rowsQ.filter((x) => COLS.every((c) => { const sel = colFilter[c.id]; return !c.filter || !sel || sel.includes(fv(c, x)); }));
    if (sortKey && sortDir) {
      const sc = COLS.find((c) => c.id === sortKey);
      out = [...out].sort((a, b) => {
        const va = sc.val(a); const vb = sc.val(b);
        let r = typeof va === 'number' && typeof vb === 'number' ? va - vb : collator.compare(String(va), String(vb));
        if (r === 0) r = a.origNo - b.origNo;
        return sortDir === 1 ? r : -r;
      });
    }
    return out;
  }, [rowsQ, colFilter, sortKey, sortDir]);

  const colOn = Object.keys(colFilter).length > 0;
  const filtered = cardFiltered || colOn || !!ql;
  const allChecked = rows.length > 0 && rows.every((x) => checked.has(x.s.id));
  const grid = canEdit ? GRID_EDIT : GRID_VIEW;

  const colMeta = (c) => {
    const counts = {};
    for (const x of rowsQ) { const k = fv(c, x); counts[k] = (counts[k] || 0) + 1; }
    const values = Object.keys(counts).sort((a, b) => (c.id === 'status' ? (STATUS_ORDER[a] ?? 9) - (STATUS_ORDER[b] ?? 9) : collator.compare(a, b)));
    return { counts, values };
  };
  const setSel = (c, values) => (arr) => {
    setColFilter((o) => {
      const n = { ...o };
      if (!arr || arr.length === values.length) delete n[c.id]; else n[c.id] = arr;
      return n;
    });
  };
  const closeFilter = useMemo(() => () => setOpenFilter(null), []);
  const anchors = useMemo(() => Object.fromEntries(COLS.map((c) => [c.id, () => btnRefs.current[c.id]])), []);

  return (
    <section aria-label="과목 목록" style={{ background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>{title} <span style={{ color: C.muted, fontWeight: 500 }}>{rows.length}과목</span></div>
        {filtered && (
          <button type="button" onClick={() => { onClearCard(); setColFilter({}); setQ(''); setOpenFilter(null); }}
            style={{ height: 32, padding: '0 12px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 999, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>전체 보기</button>
        )}
        <label className="mp-search" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, height: 40, padding: '0 12px', border: `1px solid ${C.line2}`, borderRadius: 8, flex: '0 1 280px', minWidth: 'min(240px, 100%)', boxSizing: 'border-box', fontSize: 14, color: C.muted }}>
          <Icon name="search" />
          <input type="search" aria-label="과목명 또는 교수명 검색" placeholder="과목명·교수명 검색" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: 0, outline: 'none', fontFamily: 'inherit', flex: 1, minWidth: 0, background: 'transparent', color: C.ink }} />
        </label>
      </div>

      <div className="scroll-x" style={{ overflow: 'auto', maxHeight: 760 }}>
        <div role="table" aria-label="과목 목록" aria-rowcount={rows.length + 1} style={{ minWidth: canEdit ? 1290 : 1250, fontSize: 14 }}>
          <div role="row" style={{ display: 'grid', gridTemplateColumns: grid, position: 'sticky', top: 0, zIndex: 1, background: '#F8F9FA', borderBottom: `1px solid ${C.line}`, color: C.muted, fontSize: 12, padding: '0 12px' }}>
            {canEdit && (
              <div role="columnheader" style={{ padding: '6px 4px', display: 'flex', alignItems: 'center' }}>
                <input type="checkbox" aria-label="보이는 과목 모두 선택" checked={allChecked}
                  onChange={() => setChecked(allChecked ? new Set() : new Set(rows.map((x) => x.s.id)))}
                  style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.primary, margin: 0 }} />
              </div>
            )}
            {COLS.map((c, ci) => {
              const on = sortKey === c.id && sortDir;
              const sel = colFilter[c.id];
              const open = openFilter === c.id;
              return (
                <div key={c.id} role="columnheader" aria-sort={on ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 2, padding: '4px 2px 4px 4px', minWidth: 0 }}>
                  <button type="button" aria-label={`${c.label} 정렬${on ? (sortDir === 1 ? ' (오름차순)' : ' (내림차순)') : ''}`}
                    onClick={() => { const dir = sortKey === c.id ? (sortDir + 1) % 3 : 1; setSortKey(dir ? c.id : null); setSortDir(dir); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36, padding: '0 4px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', color: on ? '#1A43A6' : C.muted }}>
                    {c.label}<span aria-hidden="true" style={{ fontSize: 10, width: 10 }}>{on ? (sortDir === 1 ? '▲' : '▼') : ''}</span>
                  </button>
                  {c.filter && (
                    <button type="button" ref={(el) => { btnRefs.current[c.id] = el; }}
                      aria-label={`${c.label} 필터${sel ? ' (적용 중)' : ''}`} aria-expanded={open}
                      onClick={() => setOpenFilter(open ? null : c.id)}
                      style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, cursor: 'pointer', padding: 0, ...(sel ? { background: '#E7EEFC', color: C.primary, border: `1px solid ${C.primary}` } : { background: 'transparent', color: C.subtle, border: '1px solid transparent' }) }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={sel ? C.primary : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z" /></svg>
                    </button>
                  )}
                  {open && (() => {
                    const m = colMeta(c);
                    return <FilterPopover anchor={anchors[c.id]} col={{ label: c.label, right: ci >= 6 }} values={m.values} counts={m.counts} sel={sel} onSet={setSel(c, m.values)} onClose={closeFilter} />;
                  })()}
                </div>
              );
            })}
          </div>
          {rows.map((x, k) => {
            const s = x.s;
            const on = checked.has(s.id);
            return (
              <div key={s.id} role="row" style={{ display: 'grid', gridTemplateColumns: grid, alignItems: 'center', borderBottom: '1px solid #EEF0F3', padding: '0 12px', minHeight: 52, background: on ? '#F5F8FE' : undefined }}>
                {canEdit && (
                  <label role="cell" style={{ padding: '6px 4px', display: 'flex', alignItems: 'center', minHeight: 44, cursor: 'pointer' }}>
                    <input type="checkbox" aria-label={`${s.name} 선택`} checked={on}
                      onChange={() => setChecked((prev) => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n; })}
                      style={{ width: 18, height: 18, cursor: 'pointer', accentColor: C.primary, margin: 0 }} />
                  </label>
                )}
                <div role="cell" style={{ padding: 8, color: C.subtle, fontVariantNumeric: 'tabular-nums' }}>{k + 1}</div>
                <div role="cell" style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
                  <Link to={courseUrl(s.id)} style={{ color: C.ink, fontWeight: 600, textDecoration: 'none' }}>{s.name}</Link>
                  <SharedTag other={s.shared} />
                </div>
                <div role="cell" style={{ padding: 8 }}>{s.professor}</div>
                <div role="cell" style={{ padding: 8 }}>{s.eval_type && <EvalChip type={s.eval_type} />}</div>
                <div role="cell" style={{ padding: 8 }}>{s.prod_status && <StatusChip status={s.prod_status} />}</div>
                <div role="cell" style={{ padding: 8, fontSize: 13, color: '#2B3038' }}>{s.owner}</div>
                <div role="cell" style={{ padding: 8, fontVariantNumeric: 'tabular-nums' }}>{s.dev_year}</div>
                <div role="cell" style={{ padding: 8, fontSize: 12, color: '#A3320B', fontWeight: 600 }}>{s.last_result}</div>
                <div role="cell" style={{ padding: 8 }}><Progress s={s} /></div>
              </div>
            );
          })}
        </div>
      </div>
      {!rows.length && (
        <div style={{ padding: '32px 20px', color: C.subtle, fontSize: 14, textAlign: 'center' }}>조건에 맞는 과목이 없어요</div>
      )}
    </section>
  );
}
