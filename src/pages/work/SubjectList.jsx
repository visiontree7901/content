// 1. 과목 리스트 (제작 묶음 단위, 공통 과목은 한 번만)
import { useEffect, useRef } from 'react';
import { C } from '../../lib/constants.js';
import { Icon, InstBadge } from '../../components/ui.jsx';
import { devYears, instLines, liveSubjects } from './helpers.js';

const PRAC = (narrow) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: narrow ? '1px 5px' : '2px 6px', borderRadius: 4, background: C.ink, color: '#fff', flexShrink: 0 }}>실습</span>
);

function Lines({ lines, width }) {
  return (
    <span style={{ fontSize: 12, color: '#2B3038', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, width }}>
      {lines.map((ln, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          {ln.inst && <InstBadge code={ln.inst} one style={{ minWidth: 18, textAlign: 'center', borderRadius: 3, boxSizing: 'border-box' }} />}
          {ln.text}
        </span>
      ))}
    </span>
  );
}

export default function SubjectList({ list, current, onPick, q, setQ, narrow }) {
  const query = q.trim();
  const matches = query ? list.filter((p) => p.name.includes(query) || (p.professor || '').includes(query)) : list;
  const boxRef = useRef(null);

  // 선택한 과목이 목록 안에서 보이도록
  useEffect(() => {
    const box = boxRef.current;
    const el = box?.querySelector('[aria-selected="true"]');
    if (!box || !el) return;
    const top = el.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + el.offsetHeight > box.scrollTop + box.clientHeight) box.scrollTop = Math.max(0, top - 44);
  }, [current?.id]);

  const rowStyle = (on) => ({
    display: 'flex', alignItems: 'center', gap: narrow ? 8 : 10, minHeight: 44, padding: '0 12px', border: 0,
    borderBottom: '1px solid #EEF0F3', textAlign: 'left', font: 'inherit', fontSize: 14, cursor: 'pointer', color: C.ink,
    flexShrink: 0, width: '100%',
    ...(on ? { background: '#E7EEFC', boxShadow: `inset 3px 0 0 ${C.primary}` } : { background: '#fff' }),
  });

  return (
    <section aria-labelledby="w-subj" style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 8 : 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: narrow ? 8 : 10, minWidth: 0 }}>
        <h2 id="w-subj" style={{ margin: 0, fontSize: narrow ? 14 : 15, fontWeight: 700, flexShrink: 0 }}>1. 과목 리스트</h2>
        {!narrow && <span style={{ fontSize: 13, color: C.muted }}>가나다순 · 검색하면 맞는 과목만 보여요</span>}
        {narrow ? (
          <span aria-live="polite" style={{ marginLeft: 'auto', minWidth: 0, textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#1A43A6', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: C.muted }}>선택 </span>{current?.name || '—'}
          </span>
        ) : (
          <span aria-live="polite" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 8, textAlign: 'right', minWidth: 0 }}>
            <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>선택한 과목</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#1A43A6' }}>{current?.name || '—'}</span>
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${C.line2}`, borderRadius: 8, overflow: 'hidden', background: '#fff', minWidth: 0 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: narrow ? 44 : 46, padding: '0 12px', borderBottom: `1px solid ${C.line}`, color: C.muted }}>
          <Icon name="search" />
          <input type="search" aria-label="과목명 또는 교수명 검색" placeholder={narrow ? '과목명·교수명 검색' : '과목명·교수명 검색 (예: 전기, 이수용)'}
            value={q} onChange={(e) => setQ(e.target.value)}
            style={{ border: 0, outline: 'none', font: 'inherit', fontSize: 14, flex: 1, minWidth: 0, height: '100%', background: 'transparent', color: C.ink }} />
          <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{narrow ? `가나다순 · ${matches.length}개` : `${matches.length}개`}</span>
        </label>
        {!narrow && (
          <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: '#F8F9FA', borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 600, color: C.muted }}>
            <span style={{ flex: 1, minWidth: 0 }}>과목명</span>
            <span style={{ width: 56 }}>교수명</span>
            <span style={{ width: 56 }}>개발년도</span>
            <span style={{ width: 96 }}>평가기관</span>
            <span style={{ width: 108 }}>제작 상태</span>
            <span style={{ width: 96 }}>평가 구분</span>
          </div>
        )}
        <div ref={boxRef} role="listbox" aria-label="과목 목록" style={{ maxHeight: narrow ? 176 : 300, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {matches.map((p) => {
            const on = p.id === current?.id;
            return (
              <button key={p.id} type="button" role="option" aria-selected={on} onClick={() => onPick(p)} style={rowStyle(on)}>
                <span style={{ fontWeight: 600, flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>{p.name}</span>
                {p.is_practicum && PRAC(narrow)}
                {narrow ? (
                  <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{p.professor}</span>
                ) : (
                  <>
                    <span style={{ fontSize: 12, color: '#2B3038', width: 56, flexShrink: 0 }}>{p.professor}</span>
                    <span style={{ fontSize: 12, color: '#2B3038', width: 56, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{devYears(p)}</span>
                    <span style={{ width: 96, flexShrink: 0, display: 'flex', gap: 4 }}>
                      {liveSubjects(p).map((s) => <InstBadge key={s.id} code={s.institute} style={{ fontSize: 12, padding: '3px 7px', borderRadius: 3 }} />)}
                    </span>
                    <Lines lines={instLines(p, 'prod_status')} width={108} />
                    <Lines lines={instLines(p, 'eval_type')} width={96} />
                  </>
                )}
              </button>
            );
          })}
          {!matches.length && (
            <div style={{ padding: narrow ? '14px 12px' : '16px 12px', fontSize: 13, color: C.muted }}>
              {narrow ? '맞는 과목이 없어요.' : '맞는 과목이 없어요. 과목명 일부나 교수명으로 찾아보세요.'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
