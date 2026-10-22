// 진행 단계: 윗줄 직접 체크(setCheck) · 아랫줄 공정별 완료 차시(자동)
import { useState } from 'react';
import { C, CHECK_ITEMS, CHECK_ITEMS_PART } from '../../lib/constants.js';
import { stageProgress, stagesOf } from '../../lib/model.js';
import * as api from '../../lib/api.js';
import { Icon } from '../../components/ui.jsx';
import { sectionBox, h2Style } from './styles.js';

const cellBox = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, minHeight: 48, padding: '0 12px', border: '1px solid #EEF0F3', borderRadius: 8, boxSizing: 'border-box', minWidth: 0 };

const badge = (n, total) => ({
  minWidth: 48, height: 26, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
  fontSize: 12, fontWeight: 700, fontVariantNumeric: 'tabular-nums', padding: '0 4px', boxSizing: 'border-box',
  ...(total > 0 && n >= total ? { background: C.primary, color: '#FFFFFF' } : n > 0 ? { background: '#E7EEFC', color: '#1A43A6' } : { background: '#F1F3F5', color: C.muted }),
});

export default function StageChecks({ p, canEdit, run }) {
  const [busy, setBusy] = useState(null);
  const items = p.kind === '일부 수정' ? CHECK_ITEMS_PART : CHECK_ITEMS;
  const stages = stagesOf(p);
  const toggle = async (item) => {
    if (!canEdit || busy) return;
    setBusy(item);
    try { await run(() => api.setCheck(p.id, item, !p.checks[item]), '저장했어요'); } catch { /* 알림은 run이 띄움 */ } finally { setBusy(null); }
  };
  return (
    <section aria-labelledby="ms-h" style={sectionBox}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 12px' }}>
        <h2 id="ms-h" style={h2Style}>진행 단계</h2>
        <span style={{ fontSize: 13, color: C.muted }}>
          {stages.length ? '윗줄은 직접 체크 · 아랫줄은 차시 매트릭스에서 자동 계산' : '직접 체크'}
        </span>
      </div>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(150px, 100%), 1fr))`, gap: 8 }}>
            {items.map((item) => {
              const on = !!p.checks[item];
              const dis = !canEdit || !!busy;
              return (
                <div key={item} style={cellBox}>
                  <button type="button" role="checkbox" aria-checked={on} aria-label={item} disabled={dis} onClick={() => toggle(item)}
                    style={{
                      width: 28, height: 28, flexShrink: 0, borderRadius: 6, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: canEdit ? (busy ? 'wait' : 'pointer') : 'default',
                      ...(on ? { background: C.primary, border: `1px solid ${C.primary}` } : { background: '#FFFFFF', border: '1.5px solid #A9B1BD' }),
                    }}>
                    {on && <Icon name="check" size={14} stroke={3} style={{ color: '#FFFFFF' }} />}
                  </button>
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
          {stages.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(min(150px, 100%), 1fr))`, gap: 8 }}>
              {stages.map((st) => {
                const { done, total } = stageProgress(p, st);
                return (
                  <div key={st} style={{ ...cellBox, background: '#FAFBFC' }}>
                    <span style={badge(done, total)}>{done}/{total}</span>
                    <span>{st}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
