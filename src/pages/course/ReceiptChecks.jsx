// 타기관 임대 과목: 받은 자료 체크(체크한 날짜 = 받은 날짜). 진행 단계·차시 현황 대신 이 카드만 보여줌
import { useState } from 'react';
import { C, RECEIPT_ITEMS } from '../../lib/constants.js';
import { fmtDate, receiptProgress } from '../../lib/model.js';
import * as api from '../../lib/api.js';
import { Icon } from '../../components/ui.jsx';
import { sectionBox, h2Style } from './styles.js';

const LEASE = '#7A4FB5';

export default function ReceiptChecks({ p, canEdit, run }) {
  const [busy, setBusy] = useState(null);
  const { done, total } = receiptProgress(p);
  const pct = Math.round((done / total) * 100);
  const owners = [...new Set(p.subjects.filter((s) => !s.deleted_at).map((s) => s.owner).filter(Boolean))].join(', ');
  const toggle = async (item) => {
    if (!canEdit || busy) return;
    setBusy(item);
    const on = item in p.receipts;
    try { await run(() => api.setReceipt(p.id, item, !on), on ? '수신 체크를 풀었어요' : '받음으로 표시했어요'); } catch { /* 알림은 run이 띄움 */ } finally { setBusy(null); }
  };
  return (
    <section aria-labelledby="rc-h" style={sectionBox}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 12px' }}>
        <h2 id="rc-h" style={h2Style}>자료 수신 여부</h2>
        <span style={{ fontSize: 13, color: C.muted }}>
          타기관 임대 과목{owners ? ` (${owners})` : ''}이라 제작 진행 대신 받은 자료만 체크해요
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
          <div role="img" aria-label={`자료 ${total}개 중 ${done}개 받음`} style={{ flex: 1, height: 8, background: '#EEE8F6', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: 8, background: LEASE }} />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {done}/{total} 받음
          </span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(190px, 100%), 1fr))', gap: 8 }}>
        {RECEIPT_ITEMS.map((item) => {
          const on = item in p.receipts;
          const when = p.receipts[item];
          return (
            <div key={item} style={{
              display: 'flex', alignItems: 'center', gap: 10, minHeight: 56, padding: '8px 12px', borderRadius: 8, boxSizing: 'border-box', minWidth: 0,
              border: `1px solid ${on ? '#D9CDEC' : '#EEF0F3'}`, background: on ? '#F7F3FC' : '#fff',
            }}>
              <button type="button" role="checkbox" aria-checked={on} aria-label={`${item} 받음`} disabled={!canEdit || !!busy} onClick={() => toggle(item)}
                style={{
                  width: 28, height: 28, flexShrink: 0, borderRadius: 6, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: canEdit ? (busy ? 'wait' : 'pointer') : 'default',
                  ...(on ? { background: LEASE, border: `1px solid ${LEASE}` } : { background: '#fff', border: '1.5px solid #A9B1BD' }),
                }}>
                {on && <Icon name="check" size={14} stroke={3} style={{ color: '#fff' }} />}
              </button>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: on ? 600 : 400, overflowWrap: 'anywhere' }}>{item}</span>
                <span style={{ fontSize: 12, color: on ? '#5B3A8C' : C.subtle }}>{on ? `받음${when ? ` · ${fmtDate(when)}` : ''}` : '미수신'}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
