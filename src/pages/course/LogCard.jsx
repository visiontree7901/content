// 카드 3: 작업 기록 (작업 입력에서 저장한 기록, 보기만)
import { C } from '../../lib/constants.js';
import { fmtDateTime, formatSessionList } from '../../lib/model.js';
import { card360, h2Style, h2Sub, muted } from './styles.js';

const list = (arr) => formatSessionList(arr).replace(/,/g, ', ');

export default function LogCard({ p }) {
  const logs = p?.logs || [];
  return (
    <section aria-labelledby="log-h" style={card360}>
      <h2 id="log-h" style={h2Style}>작업 기록 <span style={h2Sub}>자동</span></h2>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {logs.length === 0 && <p style={muted}>작업 입력에서 저장하면 여기에 자동으로 쌓여요.</p>}
        {logs.map((l) => {
          const done = l.done_sessions || [];
          const cancel = l.cancel_sessions || [];
          const meta = [(l.workers || []).join('·') || null, fmtDateTime(l.created_at), '작업 입력', l.memo || null].filter(Boolean).join(' · ');
          const lines = [];
          if (done.length) lines.push({ text: `${l.stage} ${list(done)}차시 완료`, cancel: false });
          if (cancel.length) lines.push({ text: `${l.stage} ${list(cancel)}차시 완료 취소`, cancel: true });
          if (!lines.length) lines.push({ text: `${l.stage} 기록`, cancel: false });
          return (
            <div key={l.id} style={{ display: 'flex', gap: 10, fontSize: 13, lineHeight: 1.5 }}>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: done.length || !cancel.length ? C.primary : '#A3320B', marginTop: 6, flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {lines.map((x) => (
                  <span key={x.text} style={x.cancel ? { color: '#A3320B', fontWeight: 600 } : undefined}>{x.text}</span>
                ))}
                <span style={{ fontSize: 12, color: C.subtle, overflowWrap: 'anywhere' }}>{meta}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
