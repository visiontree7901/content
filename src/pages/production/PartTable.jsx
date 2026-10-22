// 일부 수정 표: 수정 대상 차시(재촬영/재편집) 칩 + 자막 수정 진행 + 작업 메모
import { Link } from 'react-router-dom';
import { InstBadge } from '../../components/ui.jsx';
import { courseUrl } from '../../lib/nav.js';
import { isDone, stageProgress } from '../../lib/model.js';
import { latestWorkMemo, pad2 } from './helpers.js';

const COLS = 'minmax(200px, 1.4fr) 90px 110px minmax(280px, 2fr) 96px minmax(220px, 2fr)';
const TY = { 재촬영: { c: '#1F4FBF', fg: '#1A43A6' }, 재편집: { c: '#C2570C', fg: '#8A3806' } };
const chipBase = { minWidth: 30, height: 26, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', padding: '0 4px' };
const instChip = { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4 };

function Row({ item }) {
  const { p, live, insts } = item;
  const sessions = Object.keys(p.plan).map(Number).sort((a, b) => a - b);
  const chips = sessions.map((n) => {
    const method = p.plan[n];
    const t = TY[method] || TY.재촬영;
    const done = isDone(p, method, n);
    return {
      n, done, title: `${n}차시 ${method}${done ? ' 완료' : ''}`,
      style: { ...chipBase, ...(done ? { background: t.c, color: '#FFFFFF', border: `1.5px solid ${t.c}` } : { background: '#FFFFFF', color: t.fg, border: `1.5px solid ${t.c}` }) },
    };
  });
  const doneCount = chips.filter((c) => c.done).length;
  const sub = stageProgress(p, '자막');
  const memo = latestWorkMemo(p);
  return (
    <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, alignItems: 'center', borderBottom: '1px solid #EEF0F3', padding: '0 12px', fontSize: 14 }}>
      <div role="cell" style={{ padding: '12px 8px' }}>
        <Link to={courseUrl(live[0].id)} style={{ color: '#15181D', fontWeight: 600, textDecoration: 'none' }}>{p.name}</Link>
      </div>
      <div role="cell" style={{ padding: '12px 8px' }}>{p.professor}</div>
      <div role="cell" style={{ padding: '12px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {insts.map((c) => <InstBadge key={c} code={c} style={instChip} />)}
      </div>
      <div role="cell" style={{ padding: '12px 8px', display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
        {chips.length ? (
          <>
            {chips.map((c) => <span key={c.n} title={c.title} aria-label={c.title} style={c.style}>{pad2(c.n)}</span>)}
            <span style={{ fontSize: 12, color: '#4A525E', marginLeft: 6 }}>{doneCount}/{chips.length} 완료</span>
          </>
        ) : (
          <span style={{ fontSize: 13, color: '#6B7380' }}>수정 차시 미지정</span>
        )}
      </div>
      <div role="cell" style={{ padding: '12px 8px', fontSize: 13, fontWeight: 600, color: sub.total ? '#8E2B09' : '#6B7380', fontVariantNumeric: 'tabular-nums' }}>
        {sub.total ? `${sub.done}/${sub.total}` : '—'}
      </div>
      <div role="cell" title={memo || undefined} style={{ padding: '12px 8px', fontSize: 13, color: memo ? '#2B3038' : '#6B7380', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {memo || '—'}
      </div>
    </div>
  );
}

export default function PartTable({ items }) {
  return (
    <div className="scroll-x" style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: 10 }}>
      <div role="table" aria-label="일부 수정 과목" style={{ minWidth: 960 }}>
        <div role="row" style={{ display: 'grid', gridTemplateColumns: COLS, background: '#F8F9FA', borderBottom: '1px solid #E2E5EA', fontSize: 12, color: '#4A525E', fontWeight: 600, padding: '0 12px' }}>
          {['과목명', '교수', '교육원', '수정 차시', '자막 수정', '작업 메모'].map((h) => <div role="columnheader" key={h} style={{ padding: '10px 8px' }}>{h}</div>)}
        </div>
        {items.map((it) => <Row key={it.p.id} item={it} />)}
      </div>
    </div>
  );
}
