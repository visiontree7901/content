// 윗줄 왼쪽: 교육원 전환 · 이전 · 과목 검색/선택 · 다음 · 위치
import { useEffect, useMemo, useRef, useState } from 'react';
import { C, INSTITUTES } from '../../lib/constants.js';
import { Icon, STATUS_SWATCH } from '../../components/ui.jsx';

const navBtn = (ok) => ({
  height: 44, padding: '0 10px', borderRadius: 8, font: 'inherit', fontSize: 14, fontWeight: 600,
  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', flexShrink: 0,
  ...(ok ? { cursor: 'pointer', background: '#FFFFFF', color: C.ink, border: `1px solid ${C.line2}` }
    : { cursor: 'not-allowed', background: C.bg, color: '#8B95A3', border: `1px solid ${C.line}` }),
});

function InstToggle({ inst, onPick }) {
  return (
    <div role="tablist" aria-label="교육원" style={{ display: 'flex', flexShrink: 0, border: `1px solid ${C.line2}`, borderRadius: 8, overflow: 'hidden' }}>
      {['V', 'K'].map((code) => {
        const on = inst === code;
        const i = INSTITUTES[code];
        return (
          <button key={code} type="button" role="tab" aria-selected={on} onClick={() => !on && onPick(code)}
            style={{
              height: 44, padding: '0 12px', border: 0, font: 'inherit', fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
              ...(on ? { background: i.bg, color: i.text, fontWeight: 700, boxShadow: `inset 0 -3px 0 ${i.color}` } : { background: '#FFFFFF', color: '#2B3038', fontWeight: 400 }),
            }}>
            {i.short}
          </button>
        );
      })}
    </div>
  );
}

function SubjectCombo({ list, current, instName, onPick }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter((s) => s.name.toLowerCase().includes(t) || (s.professor || '').toLowerCase().includes(t));
  }, [list, q]);

  // 목록을 열면 지금 과목(없으면 첫 줄)에 표시
  useEffect(() => {
    if (!open) return;
    const i = matches.findIndex((s) => s.id === current?.id);
    setActive(i >= 0 ? i : matches.length ? 0 : -1);
  }, [open, matches, current]);

  // 바깥을 누르면 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!wrapRef.current?.contains(e.target)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // 키보드로 움직인 줄이 보이게
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const pick = (s) => { setOpen(false); setQ(''); onPick(s.id); };
  const close = () => { setOpen(false); setQ(''); };

  const onKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.min(matches.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Home' && open) {
      e.preventDefault(); setActive(matches.length ? 0 : -1);
    } else if (e.key === 'End' && open) {
      e.preventDefault(); setActive(matches.length - 1);
    } else if (e.key === 'Enter') {
      if (open && matches[active]) { e.preventDefault(); pick(matches[active]); }
    } else if (e.key === 'Escape') {
      if (open || q) { e.preventDefault(); close(); }
    } else if (e.key === 'Tab') {
      if (open) close();
    }
  };

  const activeId = open && matches[active] ? `subj-opt-${matches[active].id}` : undefined;
  return (
    <div className="crs-combo" ref={wrapRef}>
      <div style={{ display: 'flex', alignItems: 'center', height: 44, border: `1.5px solid ${open ? C.primary : C.line2}`, borderRadius: 8, background: '#FFFFFF', overflow: 'hidden', boxSizing: 'border-box' }}>
        <Icon name="search" style={{ marginLeft: 12, color: C.muted }} />
        <input ref={inputRef} type="search" role="combobox" aria-expanded={open} aria-controls="subj-list" aria-autocomplete="list"
          aria-activedescendant={activeId} aria-label="과목 검색 또는 선택" placeholder="과목명·교수명 검색" autoComplete="off"
          value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKey}
          style={{ flex: 1, minWidth: 0, height: '100%', border: 0, outline: 'none', padding: '0 10px', font: 'inherit', fontSize: 14, color: C.ink, background: 'transparent' }} />
        <button type="button" tabIndex={-1} aria-label={open ? '과목 목록 접기' : '과목 목록 펼치기'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (open) close(); else { setOpen(true); inputRef.current?.focus(); } }}
          style={{ width: 44, height: '100%', border: 0, borderLeft: `1px solid ${C.line}`, background: '#F8F9FA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.ink, flexShrink: 0 }}>
          <Icon name="down" stroke={2.2} />
        </button>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 48, left: 0, width: '100%', minWidth: 'min(400px, calc(100vw - 32px))', zIndex: 10, background: '#FFFFFF', border: `1px solid ${C.line2}`, borderRadius: 8, boxShadow: '0 10px 28px rgba(21, 24, 29, 0.18)', maxHeight: 360, overflowY: 'auto', boxSizing: 'border-box' }} ref={listRef}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', fontSize: 12, color: C.muted, borderBottom: '1px solid #EEF0F3', position: 'sticky', top: 0, background: '#FFFFFF' }}>
            <span style={{ flex: 1 }} aria-live="polite">{instName} · {matches.length}과목 · 가나다순</span>
            <button type="button" onClick={close} aria-label="목록 닫기" onMouseDown={(e) => e.preventDefault()}
              style={{ width: 28, height: 28, border: 0, background: 'transparent', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <Icon name="close" size={14} />
            </button>
          </div>
          <div id="subj-list" role="listbox" aria-label="과목 목록 (가나다순)">
            {matches.map((s, i) => {
              const on = s.id === current?.id;
              const act = i === active;
              return (
                <div key={s.id} id={`subj-opt-${s.id}`} data-idx={i} role="option" aria-selected={on} className={on ? undefined : 'crs-opt'}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => pick(s)} onMouseMove={() => active !== i && setActive(i)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, padding: '0 12px', borderBottom: '1px solid #EEF0F3',
                    boxSizing: 'border-box', fontSize: 14, color: C.ink, cursor: 'pointer',
                    background: on ? '#E7EEFC' : act ? '#F4F5F7' : '#FFFFFF',
                    boxShadow: on ? `inset 3px 0 0 ${C.primary}` : undefined,
                    outline: act ? `2px solid ${C.primary}` : undefined, outlineOffset: -2,
                  }}>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: C.muted, width: 56, flexShrink: 0 }}>{s.professor}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap', color: C.ink, border: `1.5px solid ${STATUS_SWATCH[s.prod_status] || C.line2}` }}>{s.prod_status}</span>
                </div>
              );
            })}
          </div>
          {matches.length === 0 && <div style={{ padding: '16px 12px', fontSize: 13, color: C.muted }}>맞는 과목이 없어요.</div>}
        </div>
      )}
    </div>
  );
}

export default function SubjectNav({ inst, list, current, pos, onPick, onInst }) {
  const total = list.length;
  const idx = pos - 1;
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < total - 1;
  return (
    <div className="crs-nav" style={{ background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px', minWidth: 0 }}>
      <InstToggle inst={inst} onPick={onInst} />
      <button type="button" aria-label="이전 과목" disabled={!hasPrev} onClick={() => hasPrev && onPick(list[idx - 1].id)} style={navBtn(hasPrev)}>
        <Icon name="prev" stroke={2.2} />이전
      </button>
      <SubjectCombo list={list} current={current} instName={INSTITUTES[inst].name} onPick={onPick} />
      <button type="button" aria-label="다음 과목" disabled={!hasNext} onClick={() => hasNext && onPick(list[idx + 1].id)} style={navBtn(hasNext)}>
        다음<Icon name="next" stroke={2.2} />
      </button>
      <span className="crs-count" title="가나다순" style={{ fontSize: 13, color: C.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', padding: '0 4px' }}>
        {pos > 0 ? pos : '—'} / {total}
      </span>
    </div>
  );
}
