// 2. 작업 구분 + 3. 작업 차시
import { Link } from 'react-router-dom';
import { C, PART_COLORS } from '../../lib/constants.js';
import { isDone, stageProgress, stagesOf } from '../../lib/model.js';
import { courseUrl } from '../../lib/nav.js';
import { liveSubjects } from './helpers.js';

const CANCEL = '#A3320B';

export function StageButtons({ production, stage, onStage, narrow }) {
  const isPart = production.kind === '일부 수정';
  return (
    <section aria-labelledby="w-stage" style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 8 : 10 }}>
      <h2 id="w-stage" style={{ margin: 0, fontSize: narrow ? 14 : 15, fontWeight: 700 }}>2. 작업 구분</h2>
      <div style={narrow
        ? { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }
        : { display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {stagesOf(production).map((st) => {
          const on = st === stage;
          const r = stageProgress(production, st);
          const color = isPart ? PART_COLORS[st] : C.ink;
          return (
            <button key={st} type="button" aria-pressed={on} onClick={() => onStage(st)}
              style={{
                height: 44, padding: narrow ? 0 : '0 16px', minWidth: narrow ? 0 : 104, borderRadius: 8, font: 'inherit', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                ...(on ? { background: color, color: '#fff', border: `1px solid ${color}` } : { background: '#fff', color: '#2B3038', border: `1px solid ${C.line2}` }),
              }}>
              {isPart && !on && <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
              {st}
              <span style={{ fontWeight: 500, opacity: 0.8, fontSize: narrow ? 12 : 14, fontVariantNumeric: 'tabular-nums' }}>{r.done}/{r.total}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Legend({ narrow }) {
  const sz = narrow ? 10 : 12;
  const item = (sw, text) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: narrow ? 4 : 6 }}>
      <span aria-hidden="true" style={{ width: sz, height: sz, borderRadius: 2, boxSizing: 'border-box', flexShrink: 0, ...sw }} />{text}
    </span>
  );
  const done = item({ background: '#DCE3F1' }, narrow ? '이미 완료 (누르면 취소)' : '이미 완료 (다시 누르면 취소 예정)');
  const cancel = item({ border: `2px solid ${CANCEL}`, background: C.warnBg }, '취소 예정');
  const off = item({ background: '#E9ECF0' }, narrow ? '수정 대상 아님' : '수정 대상 아님 (일부 수정 과목)');
  const sel = item({ background: C.primary }, narrow ? '완료 선택' : '오늘 선택');
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: narrow ? '6px 12px' : '6px 16px', fontSize: narrow ? 11 : 12, color: C.muted }}>
      {narrow ? <>{done}{sel}{cancel}{off}</> : <>{done}{cancel}{off}{sel}</>}
    </div>
  );
}

export function SessionGrid({ production, stage, targets, done, cancel, onToggle, onSelectRest, onClear, editable, narrow }) {
  const isPart = production.kind === '일부 수정';
  const noPlan = isPart && !Object.keys(production.plan).length;
  const targetSet = new Set(targets);
  const doneSet = new Set(done);
  const cancelSet = new Set(cancel);
  let doneN = 0;
  for (const n of targets) if (isDone(production, stage, n)) doneN++;
  const firstSubject = liveSubjects(production)[0];
  const smallBtn = {
    height: narrow ? 40 : 36, padding: '0 12px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: narrow ? 8 : 6,
    font: 'inherit', fontSize: 13, cursor: editable ? 'pointer' : 'not-allowed', color: C.ink, opacity: editable ? 1 : 0.5,
  };
  const actions = (
    <>
      <button type="button" disabled={!editable} onClick={onSelectRest} style={{ ...smallBtn, ...(narrow ? { flex: 1 } : { marginLeft: 'auto' }) }}>남은 차시 모두 선택</button>
      <button type="button" disabled={!editable} onClick={onClear} style={{ ...smallBtn, ...(narrow ? { flex: 1 } : null) }}>선택 해제</button>
    </>
  );

  return (
    <section aria-labelledby="w-ch" style={{ display: 'flex', flexDirection: 'column', gap: narrow ? 8 : 10 }}>
      {narrow ? (
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <h2 id="w-ch" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>3. 작업 차시</h2>
          <span style={{ fontSize: 12, color: C.muted }}>완료 {done.length} · 취소 {cancel.length}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '8px 16px' }}>
          <h2 id="w-ch" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>3. 작업 차시</h2>
          <span style={{ fontSize: 13, color: C.muted }}>이미 완료 {doneN} · 완료 선택 {done.length} · 취소 예정 {cancel.length}</span>
          {actions}
        </div>
      )}
      {noPlan && (
        <div role="note" style={{ background: C.warnBg, border: `1px solid ${C.warnLine}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: C.warnText, lineHeight: 1.5 }}>
          <strong>수정 차시 미지정</strong> · 재촬영·재편집할 차시가 아직 정해지지 않았어요.
          {firstSubject && <> <Link to={courseUrl(firstSubject.id)} style={{ color: C.warnText, fontWeight: 600 }}>과목 상세</Link>에서 먼저 지정해 주세요.</>}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${narrow ? 7 : 14}, minmax(0, 1fr))`, gap: 6 }}>
        {Array.from({ length: production.total_sessions }, (_, i) => i + 1).map((n) => {
          const target = targetSet.has(n);
          const wasDone = target && isDone(production, stage, n);
          const on = doneSet.has(n);
          const off = cancelSet.has(n);
          const clickable = target && editable;
          const base = {
            height: 44, borderRadius: 6, font: 'inherit', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: 0,
            cursor: clickable ? 'pointer' : 'default', minWidth: 0,
          };
          let look;
          if (!target) look = { background: '#E9ECF0', color: '#A9B1BD', border: '1px solid #E9ECF0' };
          else if (off) look = { background: C.warnBg, color: CANCEL, border: `2px solid ${CANCEL}`, textDecoration: 'line-through' };
          else if (on) look = { background: C.primary, color: '#fff', border: `1px solid ${C.primary}` };
          else if (wasDone) look = { background: '#DCE3F1', color: '#3A414C', border: '1px solid #DCE3F1' };
          else look = { background: '#fff', color: C.ink, border: `1px solid ${C.line2}` };
          const aria = `${n}차시${!target ? ' 수정 대상 아님' : ''}${wasDone ? ' 이미 완료' : ''}${on ? ' 완료 선택' : ''}${off ? ' 취소 예정' : ''}`;
          return (
            <button key={n} type="button" aria-label={aria} aria-pressed={on || off} aria-disabled={!clickable || undefined}
              data-state={!target ? 'off' : off ? 'cancel' : on ? 'select' : wasDone ? 'done' : 'todo'}
              onClick={() => { if (clickable) onToggle(n, wasDone); }}
              style={{ ...base, ...look }}>
              {n}
            </button>
          );
        })}
      </div>
      <Legend narrow={narrow} />
      {narrow && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
    </section>
  );
}
