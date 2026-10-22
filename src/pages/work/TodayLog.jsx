// 오늘 입력한 작업 (그 해 모든 과목, 최신순)
import { C } from '../../lib/constants.js';
import { instNames, sessionText, timeKST } from './helpers.js';

export default function TodayLog({ logs, narrow }) {
  const card = narrow
    ? { background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 2 }
    : { border: '1px solid #EEF0F3', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 };
  const items = logs.map((l) => {
    const workers = (l.workers || []).join(', ');
    const inst = instNames(l.production);
    const meta = [workers, timeKST(l.created_at), inst && `${inst} 반영`, l.memo].filter(Boolean).join(' · ');
    return (
      <li key={l.id} style={card}>
        <span style={{ fontSize: narrow ? 13 : 14, fontWeight: 600 }}>{l.production.name}</span>
        {!!l.cancel_sessions?.length && (
          <span data-kind="cancel" style={{ fontSize: 13, color: '#A3320B', fontWeight: 600 }}>{l.stage} {sessionText(l.cancel_sessions)}차시 완료 취소</span>
        )}
        {!!l.done_sessions?.length && (
          <span data-kind="done" style={{ fontSize: 13, color: C.ink }}>{l.stage} {sessionText(l.done_sessions)}차시 완료</span>
        )}
        <span style={{ fontSize: narrow ? 11 : 12, color: C.subtle, overflowWrap: 'anywhere' }}>{meta}</span>
      </li>
    );
  });
  const list = <ul aria-label="오늘 입력한 작업 목록" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: narrow ? 6 : 12 }}>{items}</ul>;

  if (narrow) {
    return (
      <section aria-labelledby="m-log" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 id="m-log" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>오늘 입력한 작업</h2>
        {!logs.length && <p style={{ margin: 0, fontSize: 12, color: C.muted }}>저장하면 여기에 쌓이고, 과목 상세의 작업 기록에도 남아요.</p>}
        {list}
      </section>
    );
  }
  return (
    <aside aria-labelledby="w-log" style={{ flex: '1 1 300px', minWidth: 0, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 id="w-log" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>오늘 입력한 작업</h2>
      {!logs.length && <p style={{ margin: 0, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>아직 없어요. 저장하면 여기에 쌓이고, 각 과목 상세의 작업 기록에도 남습니다.</p>}
      {list}
    </aside>
  );
}
