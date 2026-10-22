// 차시 현황(보기 전용): 신규촬영 6공정 매트릭스 / 일부 수정 3줄 + 수정 차시 변경 / 재사용 안내
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { C, NEW_STAGES, PART_COLORS, PART_METHODS, PART_STAGES } from '../../lib/constants.js';
import { isDone, stageProgress, targetSessions } from '../../lib/model.js';
import { workUrl } from '../../lib/nav.js';
import * as api from '../../lib/api.js';
import { HATCH, h2Style, legendBox, sectionBox } from './styles.js';

const WEEKS_26 = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14];
const weekStyle = { background: C.bg, borderRadius: 4, padding: '4px 0', fontWeight: 600 };

function Planner({ p, onClose, run }) {
  const T = p.total_sessions;
  const [brush, setBrush] = useState('재촬영');
  const [draft, setDraft] = useState(() => ({ ...p.plan }));
  const [busy, setBusy] = useState(false);
  const tap = (n) => setDraft((d) => {
    const next = { ...d };
    if (next[n] === brush) delete next[n]; else next[n] = brush;
    return next;
  });
  const cnt = (m) => Object.values(draft).filter((x) => x === m).length;
  const re = cnt('재촬영');
  const ed = cnt('재편집');
  const save = async () => {
    setBusy(true);
    try { await run(() => api.setPlan(p.id, draft), '저장했어요'); onClose(); } catch { /* run이 알림 */ } finally { setBusy(false); }
  };
  return (
    <div style={{ border: `2px solid ${C.primary}`, borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, background: '#FAFBFC' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>수정 차시 지정</span>
        <span style={{ fontSize: 13, color: C.muted }}>방법을 고른 뒤 차시를 누르세요. 같은 방법으로 다시 누르면 지워지고, 표시 안 한 차시는 수정 없음이에요. 수정 차시는 모두 자막 수정 대상이에요.</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="radiogroup" aria-label="수정 방법">
        {PART_METHODS.map((m) => {
          const on = brush === m;
          return (
            <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setBrush(m)}
              style={{
                height: 40, padding: '0 14px', borderRadius: 8, font: 'inherit', fontSize: 14, cursor: 'pointer',
                ...(on ? { background: C.ink, color: '#FFFFFF', border: `1px solid ${C.ink}`, fontWeight: 600 } : { background: '#FFFFFF', color: '#2B3038', border: `1px solid ${C.line2}`, fontWeight: 400 }),
              }}>
              <span aria-hidden="true" style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, marginRight: 8, verticalAlign: -1, background: PART_COLORS[m], border: `1px solid ${PART_COLORS[m]}` }} />
              {m}
            </button>
          );
        })}
      </div>
      <div className="crs-plan">
        {Array.from({ length: T }, (_, i) => i + 1).map((n) => {
          const m = draft[n];
          return (
            <button key={n} type="button" onClick={() => tap(n)} aria-label={`${n}차시 ${m || '수정 없음'}`} aria-pressed={!!m}
              style={{
                height: 40, borderRadius: 6, font: 'inherit', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: 0, cursor: 'pointer', minWidth: 0,
                ...(m ? { background: PART_COLORS[m], color: '#FFFFFF', border: `1px solid ${PART_COLORS[m]}` } : { background: '#FFFFFF', color: C.ink, border: `1px solid ${C.line2}` }),
              }}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px', fontSize: 13 }}>
        <span>재촬영 <b>{re}</b>차시</span>
        <span>재편집 <b>{ed}</b>차시</span>
        <span style={{ color: C.warnText, fontWeight: 600 }}>자막 수정 {re + ed}차시</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ height: 40, padding: '0 14px', border: `1px solid ${C.line2}`, background: '#FFFFFF', borderRadius: 8, font: 'inherit', fontSize: 13, cursor: 'pointer' }}>취소</button>
          <button type="button" onClick={save} disabled={busy} style={{ height: 40, padding: '0 16px', border: 0, background: C.primary, color: '#FFFFFF', borderRadius: 8, font: 'inherit', fontSize: 13, fontWeight: 600, cursor: busy ? 'wait' : 'pointer' }}>저장</button>
        </span>
      </div>
    </div>
  );
}

/** 공정별 마지막 작업자(작업 기록에서) */
function lastWorker(p, stage) {
  const l = p.logs.find((x) => x.stage === stage && (x.workers || []).length);
  return l ? l.workers.join('·') : '';
}

export default function SessionMatrix({ subject, p, canEdit, run }) {
  const [planning, setPlanning] = useState(false);
  const T = p.total_sessions;
  const isPart = p.kind === '일부 수정';

  if (p.kind === '재사용') {
    return (
      <section aria-labelledby="mx-h" style={sectionBox}>
        <h2 id="mx-h" style={h2Style}>차시 현황</h2>
        <p style={{ margin: 0, fontSize: 14, color: C.muted }}>재사용 과목이라 제작할 차시가 없어요. 지난 콘텐츠를 그대로 써요.</p>
      </section>
    );
  }

  const rows = isPart
    ? PART_STAGES.map((st) => {
      const targets = new Set(targetSessions(p, st));
      const { done, total } = stageProgress(p, st);
      return {
        label: st, n: done, of: total, color: PART_COLORS[st],
        worker: st === '자막' ? '수정 차시 전체' : total ? `${total}개 차시` : '대상 없음',
        cells: Array.from({ length: T }, (_, i) => { const n = i + 1; return { act: targets.has(n), done: targets.has(n) && isDone(p, st, n) }; }),
      };
    })
    : NEW_STAGES.map((st) => {
      const { done, total } = stageProgress(p, st);
      return {
        label: st, n: done, of: total, color: C.done, worker: lastWorker(p, st),
        cells: Array.from({ length: T }, (_, i) => ({ act: true, done: isDone(p, st, i + 1) })),
      };
    });

  const cellStyle = (r, c) => {
    const base = { height: 40, minWidth: 0, boxSizing: 'border-box', borderRadius: 4 };
    if (!c.act) return { ...base, background: HATCH, border: '1px solid #E9ECF0' };
    if (c.done) return { ...base, background: r.color, border: `1px solid ${r.color}` };
    return { ...base, background: '#FFFFFF', border: isPart ? `2px solid ${r.color}` : `1px solid ${C.line2}` };
  };

  const planned = Object.keys(p.plan).length;
  const summary = `${isPart ? '차시별 수정 현황' : '차시별 제작현황'}, 총 ${T}차시. `
    + rows.map((r) => `${r.label} ${r.n}/${r.of}차시 완료`).join(', ')
    + (isPart ? `. 수정 차시 ${planned}개` : '');
  const cols = `120px repeat(${T}, minmax(0, 1fr))`;

  return (
    <section aria-labelledby="mx-h" style={{ ...sectionBox, gap: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px' }}>
        <h2 id="mx-h" style={h2Style}>{isPart ? '차시별 수정 현황' : '차시별 제작현황'}</h2>
        <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 14px', fontSize: 13, color: C.muted }}>
          <span><span aria-hidden="true" style={legendBox({ background: C.primary })} />완료</span>
          <span><span aria-hidden="true" style={legendBox(isPart ? { background: '#FFFFFF', border: `2px solid ${C.primary}` } : { background: '#FFFFFF', border: '1px solid #A9B1BD' })} />미완료</span>
          {isPart && <span><span aria-hidden="true" style={legendBox({ background: HATCH })} />해당 없음</span>}
          <Link to={workUrl(subject.id)} title="작업 입력 화면에서 이 과목이 선택된 채로 열려요" style={{ fontWeight: 600 }}>{subject.name} 작업 입력하기 →</Link>
        </span>
        {isPart && canEdit && !planning && (
          <button type="button" onClick={() => setPlanning(true)}
            style={{ marginLeft: 'auto', height: 40, padding: '0 14px', border: `1.5px solid ${C.primary}`, color: '#1A43A6', background: '#FFFFFF', borderRadius: 8, font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            수정 차시 변경
          </button>
        )}
      </div>
      {planning && <Planner key={p.id} p={p} run={run} onClose={() => setPlanning(false)} />}
      {isPart && !planned && !planning && (
        <div style={{ background: '#FFF8EC', border: '1px solid #E8C48A', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#6B4A0B' }}>
          일부 수정 과목인데 수정 차시가 아직 지정되지 않았어요. {canEdit ? "'수정 차시 변경'을 눌러 재촬영·재편집할 차시를 정해 주세요." : '팀 로그인 후 재촬영·재편집할 차시를 정할 수 있어요.'}
        </div>
      )}
      <div className="scroll-x">
        <div role="img" aria-label={summary} style={{ minWidth: T === 26 ? 1100 : 120 + T * 52, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 3, fontSize: 11, color: C.muted, textAlign: 'center' }}>
            <div />
            {T === 26
              ? WEEKS_26.map((w) => <div key={w} style={{ ...weekStyle, gridColumn: 'span 2' }}>{w}주</div>)
              : <div style={{ ...weekStyle, gridColumn: '2 / -1' }}>{p.is_practicum ? '실습 과목 · ' : ''}총 {T}차시</div>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 3, fontSize: 11, color: C.subtle, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            <div />
            {Array.from({ length: T }, (_, i) => <div key={i}>{i + 1}</div>)}
          </div>
          {rows.map((r) => (
            <div key={r.label} style={{ display: 'grid', gridTemplateColumns: cols, gap: 3, alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', paddingRight: 8, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{r.label} <span style={{ fontWeight: 500, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>{r.n}/{r.of}</span></span>
                {r.worker && <span style={{ fontSize: 11, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.worker}</span>}
              </div>
              {r.cells.map((c, i) => <span key={i} style={cellStyle(r, c)} />)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
