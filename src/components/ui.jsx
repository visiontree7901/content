// 공통 화면 조각: 아이콘, 배지, 버튼, 대화상자 등 (시안과 같은 모양)
import { useEffect, useRef } from 'react';
import { C, EVAL_STYLE, INSTITUTES } from '../lib/constants.js';

export const STATUS_SWATCH = { 신규촬영: '#1F4FBF', '일부 수정': '#C2570C', 재사용: '#8B95A3' };

const ICONS = {
  prev: <path d="M15 18l-6-6 6-6" />,
  next: <path d="M9 18l6-6-6-6" />,
  down: <path d="M6 9l6 6 6-6" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M5 20h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13 7l4 4" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 12l5 5 9-10" />,
  sort: <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />,
  filter: <path d="M4 5h16l-6 8v5l-4 2v-7L4 5z" />,
  restore: <><path d="M4 12a8 8 0 1 0 3-6.2" /><path d="M4 4v5h5" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20c1.5-4 5-5 8-5s6.5 1 8 5" /></>,
};

export function Icon({ name, size = 16, stroke = 2, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none', ...style }}>
      {ICONS[name]}
    </svg>
  );
}

/** 교육원 배지: 연한 배경 + 대표색 글씨. one=true면 '비/건' 한 글자 */
export function InstBadge({ code, one = false, style }) {
  const i = INSTITUTES[code];
  if (!i) return null;
  return (
    <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, padding: one ? '1px 5px' : '2px 7px', borderRadius: 4, background: i.bg, color: i.text, whiteSpace: 'nowrap', ...style }}>
      {one ? i.one : i.short}
    </span>
  );
}

/** '비전 공통' / '건국 공통' 태그 — 다른 교육원 색으로 표시 */
export function SharedTag({ other }) {
  if (!other) return null;
  const i = INSTITUTES[other];
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: i.bg, color: i.text, whiteSpace: 'nowrap' }}>
      {i.short} 공통
    </span>
  );
}

/** 평가 구분(신규/재평가) 칩 */
export function EvalChip({ type, swatch = false }) {
  const s = EVAL_STYLE[type] || EVAL_STYLE['재평가'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: s.bg, color: s.text, whiteSpace: 'nowrap' }}>
      {swatch && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: s.swatch }} />}
      {type}
    </span>
  );
}

/** 제작 상태(신규촬영/일부 수정/재사용) 칩 */
export function StatusChip({ status }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4, color: C.ink, border: `1.5px solid ${STATUS_SWATCH[status] || C.line2}`, whiteSpace: 'nowrap', background: '#fff' }}>
      {status}
    </span>
  );
}

const BTN = {
  base: { height: 44, padding: '0 16px', borderRadius: 8, font: 'inherit', fontSize: 14, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap' },
  primary: { border: 0, background: C.primary, color: '#fff', fontWeight: 600 },
  secondary: { border: `1px solid ${C.line2}`, background: '#fff', color: C.ink },
  danger: { border: `1px solid #F1B7B0`, background: '#fff', color: C.danger },
  ghost: { border: 0, background: 'transparent', color: C.primary, fontWeight: 600 },
  disabled: { opacity: 0.45, cursor: 'not-allowed' },
};

export function Button({ kind = 'secondary', icon, children, disabled, small, style, ...rest }) {
  return (
    <button type="button" disabled={disabled} {...rest}
      style={{ ...BTN.base, ...BTN[kind], ...(small ? { height: 36, padding: '0 12px', fontSize: 13 } : null), ...(disabled ? BTN.disabled : null), ...style }}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

export function Card({ title, right, children, style, bodyStyle }) {
  return (
    <section style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      {(title || right) && (
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px', borderBottom: `1px solid ${C.line}` }}>
          {title && <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h2>}
          {right && <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{right}</div>}
        </header>
      )}
      <div style={{ padding: 18, minWidth: 0, ...bodyStyle }}>{children}</div>
    </section>
  );
}

/** 대화상자. onClose는 Esc·바깥 클릭에도 호출 */
export function Modal({ title, onClose, children, footer, width = 640 }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(21,24,29,0.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 16px', zIndex: 50, overflowY: 'auto' }}>
      <div role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}
        style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: width, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', outline: 'none' }}>
        <header style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${C.line}` }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ marginLeft: 'auto', width: 36, height: 36, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="close" size={18} />
          </button>
        </header>
        <div style={{ padding: 20 }}>{children}</div>
        {footer && <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 20px', borderTop: `1px solid ${C.line}` }}>{footer}</footer>}
      </div>
    </div>
  );
}

/** 라벨 + 입력칸 */
export function Field({ label, required, children, hint, style }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: C.muted, minWidth: 0, ...style }}>
      <span style={{ fontWeight: 600 }}>{label}{required && <span style={{ color: C.danger }}> *</span>}</span>
      {children}
      {hint && <span style={{ fontSize: 12, color: C.subtle }}>{hint}</span>}
    </label>
  );
}

export const inputStyle = { height: 40, border: `1px solid ${C.line2}`, borderRadius: 8, padding: '0 10px', font: 'inherit', fontSize: 14, color: C.ink, background: '#fff', minWidth: 0, width: '100%', boxSizing: 'border-box' };

/** 담당자 선택: 기본 4명 칩 + 직접 입력 */
export function PeoplePicker({ value, onChange, multiple = false, people, label = '담당자' }) {
  const list = people || ['강창용', '임동규', '이지형', '김가림'];
  const sel = multiple ? value || [] : value ? [value] : [];
  const toggle = (name) => {
    if (multiple) onChange(sel.includes(name) ? sel.filter((x) => x !== name) : [...sel, name]);
    else onChange(sel.includes(name) ? '' : name);
  };
  const custom = sel.filter((x) => !list.includes(x));
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {list.map((n) => {
        const on = sel.includes(n);
        return (
          <button key={n} type="button" aria-pressed={on} onClick={() => toggle(n)}
            style={{ height: 32, padding: '0 12px', borderRadius: 999, border: `1px solid ${on ? C.primary : C.line2}`, background: on ? '#E7EEFC' : '#fff', color: on ? '#1A43A6' : C.ink, font: 'inherit', fontSize: 13, fontWeight: on ? 700 : 500, cursor: 'pointer' }}>
            {n}
          </button>
        );
      })}
      <input aria-label={`${label} 직접 입력`} placeholder="직접 입력" value={multiple ? custom.join(', ') : custom[0] || ''}
        onChange={(e) => {
          const typed = e.target.value;
          if (multiple) {
            const base = sel.filter((x) => list.includes(x));
            const extra = typed.split(',').map((s) => s.trim()).filter(Boolean);
            onChange([...base, ...extra]);
          } else onChange(typed);
        }}
        style={{ ...inputStyle, height: 32, width: 110, borderRadius: 999, fontSize: 13 }} />
    </div>
  );
}

export function Loading() {
  return <p role="status" style={{ color: C.subtle, padding: '40px 0', textAlign: 'center' }}>불러오는 중…</p>;
}

export function ErrorBox({ text }) {
  return <p role="alert" style={{ color: C.danger, background: C.dangerBg, padding: '12px 16px', borderRadius: 8 }}>{text}</p>;
}
