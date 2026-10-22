// 과목 상세 화면 전용 스타일 조각 (시안 Course.dc.html 값 그대로)
import { C } from '../../lib/constants.js';

export const sectionBox = {
  background: '#FFFFFF', border: `1px solid ${C.line}`, borderRadius: 10, padding: 20,
  display: 'flex', flexDirection: 'column', gap: 12, boxSizing: 'border-box', minWidth: 0,
};
export const card360 = { ...sectionBox, minHeight: 0, height: 360 };
export const h2Style = { margin: 0, fontSize: 16, fontWeight: 700 };
export const h2Sub = { fontSize: 12, fontWeight: 500, color: C.muted };
export const muted = { margin: 0, fontSize: 13, color: C.subtle };

export const smallLink = (color) => ({
  height: 26, padding: '0 6px', border: 0, background: 'transparent', borderRadius: 4,
  font: 'inherit', fontSize: 11, color, cursor: 'pointer',
});
export const miniBtn = (primary) => ({
  height: 32, padding: '0 10px', borderRadius: 6, font: 'inherit', fontSize: 12, cursor: 'pointer',
  ...(primary ? { border: 0, background: C.primary, color: '#FFFFFF', fontWeight: 600 } : { border: `1px solid ${C.line2}`, background: '#FFFFFF', color: C.ink }),
});
export const addBtn = (ready) => ({
  minHeight: 40, padding: '0 14px', border: 0, borderRadius: 6, font: 'inherit', fontSize: 13, fontWeight: 600,
  cursor: ready ? 'pointer' : 'not-allowed', flexShrink: 0,
  ...(ready ? { background: C.primary, color: '#FFFFFF' } : { background: C.line, color: C.muted }),
});
export const textareaStyle = {
  flex: 1, minWidth: 0, padding: '8px 10px', border: `1px solid ${C.line2}`, borderRadius: 6,
  font: 'inherit', fontSize: 13, lineHeight: 1.45, color: C.ink, resize: 'vertical', boxSizing: 'border-box',
};
export const legendBox = (extra) => ({
  display: 'inline-block', width: 14, height: 14, borderRadius: 3, boxSizing: 'border-box',
  verticalAlign: -2, marginRight: 5, ...extra,
});
// '해당 없음' 칸: 회색 + 빗금
export const HATCH = 'repeating-linear-gradient(135deg, #E9ECF0 0 4px, #DCE0E6 4px 6px)';

// 화면 폭에 따른 배치(인라인 style로는 못 하는 부분만)
export const PAGE_CSS = `
.crs-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(480px, 100%), 1fr)); gap: 16px; }
.crs-nav { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.crs-combo { position: relative; flex: 1 1 140px; min-width: 140px; }
.crs-opt:hover { background: #F4F5F7 !important; }
.crs-plan { display: grid; grid-template-columns: repeat(14, minmax(0, 1fr)); gap: 4px; }
@media (max-width: 720px) {
  .crs-combo { order: 10; flex-basis: 100%; }
  .crs-count { margin-left: auto; }
  .crs-plan { grid-template-columns: repeat(7, minmax(0, 1fr)); }
}
`;
