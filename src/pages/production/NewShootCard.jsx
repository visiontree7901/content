// 신규촬영 카드: 과목명·교수·촬영지·교육원 + 공정별 차시 칸(완료/미완료)
import { Link } from 'react-router-dom';
import { InstBadge } from '../../components/ui.jsx';
import { courseUrl } from '../../lib/nav.js';
import { NEW_STAGES } from '../../lib/constants.js';
import { isDone, stageProgress } from '../../lib/model.js';
import { latestWorkMemo, locationOf } from './helpers.js';

// 26차시 과목: 위에는 2칸마다 주차(8주 중간고사 제외), 아래에는 1–7주 / 9–14주를 색이 다른 선으로 구분
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];
const chip = { fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4 };

function heads(t) {
  if (t === 26) return WEEKS.map((w) => ({ text: `${w}주`, style: { gridColumn: 'span 2', whiteSpace: 'nowrap', overflow: 'hidden' } }));
  return Array.from({ length: t }, (_, i) => ({ text: String(i + 1), style: { overflow: 'hidden' } }));
}

function marks(t) {
  const m = (col, color, title) => ({ title, style: { gridColumn: col, height: 3, borderRadius: 2, background: color } });
  if (t === 26) return [m('1 / 15', '#1F4FBF', '1–7주 (1–14차시)'), m('15 / 27', '#C2570C', '9–14주 (15–26차시)')];
  return [m(`1 / ${t + 1}`, '#8B95A3', `1–${t}차시`)];
}

export default function NewShootCard({ item }) {
  const { p, live, insts } = item;
  const t = p.total_sessions;
  const cols = { display: 'grid', gridTemplateColumns: `repeat(${t}, minmax(0, 1fr))`, gap: 2, flex: 1, minWidth: 0 };
  const memo = latestWorkMemo(p);
  return (
    <article style={{ background: '#FFFFFF', border: '1px solid #E2E5EA', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
          <Link to={courseUrl(live[0].id)} style={{ fontSize: 16, fontWeight: 700, color: '#15181D', textDecoration: 'none', overflowWrap: 'anywhere' }}>{p.name}</Link>
          <div style={{ fontSize: 13, color: '#4A525E' }}>{p.professor || '교수 미입력'} · 촬영지 {locationOf(live)}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4, flexShrink: 0 }}>
          {p.is_practicum && <span style={{ ...chip, background: '#15181D', color: '#FFFFFF' }}>실습 · {t}차시</span>}
          {insts.map((c) => <InstBadge key={c} code={c} style={chip} />)}
        </div>
      </div>

      <div className="scroll-x">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 280 }} role="group" aria-label="공정별 차시 진행">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} aria-hidden="true">
            <span style={{ width: 34, flex: 'none' }} />
            <div style={{ ...cols, fontSize: 9, color: '#4A525E', textAlign: 'center', fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4 }}>
              {heads(t).map((h, i) => <span key={i} style={h.style}>{h.text}</span>)}
            </div>
            <span style={{ width: 40, flex: 'none' }} />
          </div>
          {NEW_STAGES.map((st) => {
            const { done } = stageProgress(p, st);
            return (
              <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 34, flex: 'none', fontSize: 11, color: '#4A525E' }}>{st}</span>
                <div style={cols} aria-label={`${st} ${done}/${t}차시 완료`} role="img">
                  {Array.from({ length: t }, (_, i) => {
                    const on = isDone(p, st, i + 1);
                    return <span key={i} title={`${st} ${i + 1}차시 ${on ? '완료' : '미완료'}`}
                      style={{ display: 'block', height: 12, borderRadius: 2, background: on ? '#1F4FBF' : '#E2E5EA' }} />;
                  })}
                </div>
                <span style={{ width: 40, flex: 'none', textAlign: 'right', fontSize: 11, fontVariantNumeric: 'tabular-nums', color: '#2B3038' }}>{done}/{t}</span>
              </div>
            );
          })}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }} aria-hidden="true">
            <span style={{ width: 34, flex: 'none' }} />
            <div style={cols}>
              {marks(t).map((m, i) => <span key={i} title={m.title} style={m.style} />)}
            </div>
            <span style={{ width: 40, flex: 'none' }} />
          </div>
        </div>
      </div>

      {memo && (
        <div title={memo} style={{ fontSize: 13, color: '#2B3038', background: '#F4F5F7', borderRadius: 6, padding: '8px 10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{memo}</div>
      )}
    </article>
  );
}
