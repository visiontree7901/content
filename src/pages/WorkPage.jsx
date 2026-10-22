// 작업 입력: 제작 묶음(공통 과목은 한 번) → 공정 → 차시 완료/취소 → 작업자·메모 → 저장
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { saveWork } from '../lib/api.js';
import { C, TEAM } from '../lib/constants.js';
import { isDone, stagesOf, targetSessions } from '../lib/model.js';
import { ErrorBox, Icon, Loading, PeoplePicker } from '../components/ui.jsx';
import SubjectList from './work/SubjectList.jsx';
import { SessionGrid, StageButtons } from './work/SessionPicker.jsx';
import TodayLog from './work/TodayLog.jsx';
import { defaultStage, liveSubjects, todayLabelKST, todayLogs, workProductions } from './work/helpers.js';
import { useMedia } from './work/useMedia.js';

const toggleIn = (arr, n) => (arr.includes(n) ? arr.filter((x) => x !== n) : [...arr, n].sort((a, b) => a - b));

export default function WorkPage() {
  const { model, loading, error, isTeam, locked, canEdit, year, run } = useApp();
  const narrow = useMedia('(max-width: 720px)');
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [pickedId, setPickedId] = useState(null);
  const [sel, setSel] = useState({ pid: null, stage: null, done: [], cancel: [] });
  const [workers, setWorkers] = useState([]);
  const [memo, setMemo] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => (model ? workProductions(model) : []), [model]);
  const logs = useMemo(() => (model ? todayLogs(model) : []), [model]);

  if (error) return <ErrorBox text={error} />;
  if (loading || !model) return <Loading />;

  const urlSubject = model.subjectById.get(Number(params.get('subject')));
  const current = list.find((p) => p.id === pickedId) || list.find((p) => p.id === urlSubject?.production_id) || list[0] || null;
  const urlNotListed = urlSubject && !pickedId && current?.id !== urlSubject.production_id;

  const stages = current ? stagesOf(current) : [];
  const stage = current && sel.pid === current.id && stages.includes(sel.stage) ? sel.stage : current ? defaultStage(current) : null;
  const same = current && sel.pid === current.id && sel.stage === stage;
  const done = same ? sel.done : [];
  const cancel = same ? sel.cancel : [];
  const targets = current ? targetSessions(current, stage) : [];

  const pick = (p) => {
    setPickedId(p.id);
    const sid = liveSubjects(p)[0]?.id;
    if (sid) setParams((prev) => { const n = new URLSearchParams(prev); n.set('subject', String(sid)); return n; }, { replace: true });
  };
  const setStage = (st) => setSel({ pid: current.id, stage: st, done: [], cancel: [] });
  const toggle = (n, wasDone) => setSel({
    pid: current.id, stage,
    done: wasDone ? done : toggleIn(done, n),
    cancel: wasDone ? toggleIn(cancel, n) : cancel,
  });
  const selectRest = () => setSel({ pid: current.id, stage, done: targets.filter((n) => !isDone(current, stage, n)), cancel });
  const clear = () => setSel({ pid: current.id, stage, done: [], cancel: [] });

  const who = workers.map((w) => w.trim()).filter(Boolean);
  const count = done.length + cancel.length;
  const ready = canEdit && !!current && count > 0 && who.length > 0 && !busy;
  const summary = [cancel.length ? `${cancel.length}개 취소` : '', done.length ? `${done.length}개 완료` : ''].filter(Boolean).join(' · ');
  let saveLabel;
  if (!isTeam) saveLabel = '팀 로그인 후 입력할 수 있어요';
  else if (locked) saveLabel = `${year}년 기록은 잠겨 있어요`;
  else if (!count) saveLabel = '차시를 선택하세요';
  else if (!who.length) saveLabel = '작업자를 선택하세요';
  else if (busy) saveLabel = '저장하는 중…';
  else saveLabel = narrow ? `${current.name} ${stage} ${summary} 저장` : `${stage} ${summary}로 저장`;

  const save = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await run(() => saveWork({ productionId: current.id, stage, done, cancel, workers: who, memo: memo.trim() }), '저장했어요');
      setSel({ pid: current.id, stage, done: [], cancel: [] });
      setMemo('');
    } catch { /* 알림은 run이 띄움 */ } finally { setBusy(false); }
  };

  const saveBtn = (
    <button type="button" onClick={save} disabled={!ready} aria-disabled={!ready}
      style={{
        border: 0, font: 'inherit', fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed',
        ...(narrow ? { width: '100%', minHeight: 52, padding: '6px 12px', borderRadius: 10 } : { height: 48, padding: '0 24px', borderRadius: 8, whiteSpace: 'nowrap' }),
        ...(ready ? { background: C.primary, color: '#fff' } : { background: C.line, color: C.muted }),
      }}>
      {saveLabel}
    </button>
  );

  const editNote = !canEdit && (
    <div role="note" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: locked ? C.warnText : C.muted, background: locked ? C.warnBg : '#F4F5F7', border: `1px solid ${locked ? C.warnLine : C.line}`, borderRadius: 8, padding: '8px 12px' }}>
      <Icon name="lock" size={14} />
      {!isTeam ? '팀 로그인 후 입력할 수 있어요. 목록과 오늘 기록은 볼 수 있어요.' : `${year}년 기록은 잠겨 있어 보기만 할 수 있어요.`}
    </div>
  );

  const urlNote = urlNotListed && (
    <div role="note" style={{ fontSize: 13, color: C.muted, background: '#F4F5F7', border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 12px' }}>
      {urlSubject.name}은(는) {urlSubject.production?.kind === '재사용' ? '재사용 과목이라' : urlSubject.production?.kind === '타기관 임대' ? '타기관 임대 과목이라(받은 자료는 과목 상세에서 체크)' : '이 목록에 없어'} 입력할 작업이 없어요.
    </div>
  );

  const peopleCss = `.wp-people button, .wp-people input { height: ${narrow ? 40 : 36}px !important; }${narrow ? ' .wp-people input { flex: 1 1 110px; min-width: 110px !important; width: auto !important; border-radius: 8px !important; }' : ''}`;
  const people = (
    <fieldset disabled={!canEdit} className="wp-people" style={{ border: 0, margin: 0, padding: 0, minWidth: 0, opacity: canEdit ? 1 : 0.6 }}>
      <style>{peopleCss}</style>
      {narrow ? (
        <legend style={{ padding: 0, marginBottom: 8, fontSize: 14, fontWeight: 700 }}>작업자</legend>
      ) : (
        <legend className="visually-hidden">작업자</legend>
      )}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {!narrow && <span aria-hidden="true" style={{ fontSize: 13, color: C.muted, width: 44, flexShrink: 0 }}>작업자</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <PeoplePicker multiple value={workers} onChange={setWorkers} people={TEAM} label="작업자" />
        </div>
      </div>
    </fieldset>
  );
  const memoBox = (
    <textarea aria-label="메모" placeholder={narrow ? '메모 (선택, 예: 1강 → 10강 오입력 수정)' : '선택 사항 (예: 1강 → 10강 오입력 수정)'}
      value={memo} onChange={(e) => setMemo(e.target.value)} disabled={!canEdit} rows={narrow ? 2 : 1}
      style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '11px 12px', border: `1px solid ${C.line2}`, borderRadius: 8, font: 'inherit', fontSize: 14, lineHeight: 1.45, color: C.ink, resize: 'vertical', boxSizing: 'border-box', width: '100%', background: canEdit ? '#fff' : '#F8F9FA' }} />
  );

  const empty = (
    <div style={{ background: '#fff', border: '1px dashed #A9B1BD', borderRadius: 10, padding: narrow ? 16 : '40px 32px', fontSize: narrow ? 13 : 15, color: '#2B3038' }}>
      {year}년에는 입력할 작업(신규촬영·일부 수정)이 있는 과목이 없어요.
    </div>
  );

  const title = (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: narrow ? '4px 8px' : '8px 16px' }}>
      <h1 style={{ margin: 0, fontSize: narrow ? 20 : 26, fontWeight: 700, letterSpacing: narrow ? 0 : -0.3 }}>작업 입력</h1>
      <span style={{ fontSize: narrow ? 13 : 14, color: C.muted }}>
        {todayLabelKST()}{!narrow && ' · 입력한 작업은 해당 과목이 들어간 교육원 현황에 모두 반영됩니다'}
      </span>
    </div>
  );

  if (narrow) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {title}
        {editNote}
        {urlNote}
        {!current ? empty : (
          <>
            <SubjectList list={list} current={current} onPick={pick} q={q} setQ={setQ} narrow />
            <StageButtons production={current} stage={stage} onStage={setStage} narrow />
            <SessionGrid production={current} stage={stage} targets={targets} done={done} cancel={cancel}
              onToggle={toggle} onSelectRest={selectRest} onClear={clear} editable={canEdit} narrow />
            <section aria-label="작업자와 메모" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {people}
              {memoBox}
            </section>
          </>
        )}
        <TodayLog logs={logs} narrow />
        {current && (
          <div style={{ position: 'sticky', bottom: 0, margin: '0 -16px -40px', padding: '10px 16px 16px', background: '#fff', borderTop: `1px solid ${C.line}`, zIndex: 5 }}>
            {saveBtn}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
      {title}
      {urlNote}
      {!current ? empty : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flex: '999 1 720px', minWidth: 0, background: '#fff', border: `1px solid ${C.line}`, borderRadius: 10, padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {editNote}
            <SubjectList list={list} current={current} onPick={pick} q={q} setQ={setQ} />
            <StageButtons production={current} stage={stage} onStage={setStage} />
            <SessionGrid production={current} stage={stage} targets={targets} done={done} cancel={cancel}
              onToggle={toggle} onSelectRest={selectRest} onClear={clear} editable={canEdit} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, borderTop: '1px solid #EEF0F3', paddingTop: 20 }}>
              {people}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
                <label style={{ flex: '1 1 320px', display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: C.muted }}>
                  <span style={{ width: 44, flexShrink: 0, lineHeight: '44px' }}>메모</span>
                  {memoBox}
                </label>
                {saveBtn}
              </div>
            </div>
          </div>
          <TodayLog logs={logs} />
        </div>
      )}
      {!current && <TodayLog logs={logs} />}
    </div>
  );
}
