// 1. 기관별 평가 현황 — 교육원 탭 · 요약 카드 · 과목 목록 · 과목 추가/수정/삭제 · 엑셀 내려받기/업로드
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import * as api from '../lib/api.js';
import { C, EVAL_STYLE, INSTITUTES } from '../lib/constants.js';
import { downloadXlsx, subjectToRow } from '../lib/excel.js';
import { ErrorBox, Icon, Loading, STATUS_SWATCH } from '../components/ui.jsx';
import SubjectList from './main/SubjectList.jsx';
import SubjectForm from './main/SubjectForm.jsx';
import UploadPanel from './main/UploadPanel.jsx';

const CSS = `
.mp-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.mp-card { text-align: left; font-family: inherit; color: inherit; cursor: pointer; background: #fff; border-radius: 10px; padding: 16px 20px; display: flex; flex-direction: column; gap: 6px; border: 1px solid #E2E5EA; min-width: 0; }
.mp-card[aria-pressed="true"] { border: 2px solid #15181D; padding: 15px 19px; }
.mp-card:hover { border-color: #A9B1BD; }
.mp-card[aria-pressed="true"]:hover { border-color: #15181D; }
.mp-num { font-size: 32px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
@media (max-width: 720px) {
  .mp-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .mp-card { padding: 12px 14px; }
  .mp-card[aria-pressed="true"] { padding: 11px 13px; }
  .mp-num { font-size: 26px; }
  .mp-tab { padding: 0 10px !important; font-size: 14px !important; }
  .mp-search { flex: 1 1 100% !important; margin-left: 0 !important; }
}
`;

const TITLES = { all: '전체 평가 과목', 신규: '신규 평가 과목', 재평가: '재평가 과목', 신규촬영: '신규촬영 과목', '일부 수정': '일부 수정 과목', 재사용: '재사용 과목' };
const TESTS = {
  all: () => true,
  신규: (s) => s.eval_type === '신규',
  재평가: (s) => s.eval_type === '재평가',
  신규촬영: (s) => s.prod_status === '신규촬영',
  '일부 수정': (s) => s.prod_status === '일부 수정',
  재사용: (s) => s.prod_status === '재사용',
};

const toolBtn = { height: 44, padding: '0 16px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' };
const pickBtn = (ok, danger) => ({
  height: 44, padding: '0 16px', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
  ...(ok
    ? { cursor: 'pointer', background: '#fff', ...(danger ? { color: '#A3320B', border: '1.5px solid #A3320B' } : { color: '#1A43A6', border: `1.5px solid ${C.primary}` }) }
    : { cursor: 'not-allowed', background: C.bg, color: C.subtle, border: '1px solid #D5D9DF' }),
});

function SummaryCard({ id, label, value, sub, swatch, filter, setFilter }) {
  const on = filter === id;
  return (
    <button type="button" className="mp-card" aria-pressed={on} onClick={() => setFilter(on ? 'all' : id)}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.muted }}>
        {swatch && <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 2, background: swatch, flex: 'none' }} />}
        {label}
      </span>
      <span className="mp-num">{value}</span>
      <span style={{ fontSize: 13, color: C.muted }}>{sub}</span>
    </button>
  );
}

export default function MainPage() {
  const { model, loading, error, year, isTeam, canEdit, canUpload, run, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const inst = params.get('inst') === 'K' ? 'K' : 'V';
  const [filter, setFilter] = useState('all');
  const [checked, setChecked] = useState(() => new Set());
  const [form, setForm] = useState(null); // null | { mode: 'add' } | { mode: 'edit', id }
  const [showUp, setShowUp] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exporting, setExporting] = useState(false);

  const pickInst = (code) => {
    if (code === inst) return;
    const next = new URLSearchParams(params);
    if (code === 'K') next.set('inst', 'K'); else next.delete('inst');
    setParams(next);
  };

  // 교육원·연도가 바뀌면 거르기·체크를 처음으로
  useEffect(() => { setFilter('all'); setChecked(new Set()); setConfirmDel(false); }, [inst, year]);

  const list = useMemo(() => (model ? model.active.filter((s) => s.institute === inst) : []), [model, inst]);
  const deleted = useMemo(() => (model ? model.deleted.filter((s) => s.institute === inst) : []), [model, inst]);

  // 다시 불러온 뒤 없어진 과목은 체크에서 뺌
  useEffect(() => {
    setChecked((prev) => {
      const ids = new Set(list.map((s) => s.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [list]);
  useEffect(() => { if (!canEdit) { setChecked(new Set()); setConfirmDel(false); setForm(null); } }, [canEdit]);
  useEffect(() => { if (!canUpload) setShowUp(false); }, [canUpload]);

  const closeForm = useCallback(() => setForm(null), []);
  const savedForm = useCallback(() => { setForm(null); setChecked(new Set()); }, []);
  const closeUpload = useCallback(() => setShowUp(false), []);

  if (error) return <ErrorBox text={error} />;
  if (loading || !model) return <Loading />;

  const I = INSTITUTES[inst];
  const n = { all: list.length };
  for (const k of Object.keys(TESTS)) if (k !== 'all') n[k] = list.filter(TESTS[k]).length;
  const split = (st) => {
    const l = list.filter((s) => s.prod_status === st);
    return `신규 ${l.filter((s) => s.eval_type === '신규').length} · 재평가 ${l.filter((s) => s.eval_type === '재평가').length}`;
  };
  const shown = list.filter(TESTS[filter] || TESTS.all);
  const checkedList = list.filter((s) => checked.has(s.id));

  const doExport = async () => {
    setExporting(true);
    try {
      await downloadXlsx(list.map((s) => subjectToRow(s, isTeam)), `${year}_${I.short}_평가과목.xlsx`);
    } catch (e) {
      notify(e.message || '엑셀 파일을 만들지 못했어요', 'error');
    } finally {
      setExporting(false);
    }
  };
  const doDelete = async () => {
    const ids = checkedList.map((s) => s.id);
    try {
      await run(() => api.deleteSubjects(ids), `${ids.length}과목을 삭제했어요`);
      setChecked(new Set()); setConfirmDel(false);
    } catch { /* 알림은 run이 띄움 */ }
  };
  const restore = async (s) => {
    try { await run(() => api.restoreSubjects([s.id]), `${s.name} 과목을 복구했어요`); } catch { /* 알림은 run이 띄움 */ }
  };

  const tab = (code) => {
    const on = inst === code;
    return (
      <button key={code} type="button" role="tab" aria-selected={on} className="mp-tab" onClick={() => pickInst(code)}
        style={{ height: 48, padding: '0 18px', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 15, cursor: 'pointer', marginBottom: -2, whiteSpace: 'nowrap', ...(on ? { color: C.ink, fontWeight: 700, borderBottom: `3px solid ${INSTITUTES[code].color}` } : { color: C.muted, borderBottom: '3px solid transparent' }) }}>
        {INSTITUTES[code].name}
      </button>
    );
  };

  const editSubject = form?.mode === 'edit' ? model.subjectById.get(form.id) : null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 24px' }}>
        <div role="tablist" aria-label="교육원" style={{ display: 'flex', borderBottom: `2px solid ${C.line}`, maxWidth: '100%' }}>
          {tab('V')}{tab('K')}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <button type="button" onClick={doExport} disabled={exporting || !list.length} style={{ ...toolBtn, ...(exporting || !list.length ? { opacity: 0.55, cursor: 'not-allowed' } : null) }}>
            <Icon name="download" />{exporting ? '만드는 중…' : '엑셀로 내려받기'}
          </button>
          {canUpload && (
            <button type="button" onClick={() => { setShowUp(true); setForm(null); setConfirmDel(false); }} aria-expanded={showUp} style={toolBtn}>
              <Icon name="upload" />엑셀 업로드
            </button>
          )}
          {canEdit && (
            <>
              <button type="button" onClick={() => { setForm({ mode: 'add' }); setConfirmDel(false); }}
                style={{ ...toolBtn, border: 0, padding: '0 18px', background: C.primary, color: '#fff', fontWeight: 600 }}>
                <Icon name="plus" stroke={2.4} />과목 추가
              </button>
              <button type="button" disabled={checkedList.length !== 1} title="목록에서 과목 1개를 체크하면 쓸 수 있어요"
                onClick={() => { if (checkedList.length === 1) { setForm({ mode: 'edit', id: checkedList[0].id }); setConfirmDel(false); } }}
                style={pickBtn(checkedList.length === 1)}>
                <Icon name="edit" />과목 수정
              </button>
              <button type="button" disabled={!checkedList.length} title="삭제할 과목을 체크하세요"
                onClick={() => { if (checkedList.length) setConfirmDel(true); }}
                style={pickBtn(checkedList.length > 0, true)}>
                <Icon name="trash" />과목 삭제{checkedList.length ? ` (${checkedList.length})` : ''}
              </button>
            </>
          )}
        </div>
      </div>

      {showUp && canUpload && <UploadPanel onClose={closeUpload} />}

      {confirmDel && canEdit && checkedList.length > 0 && (
        <div role="alertdialog" aria-labelledby="del-h" style={{ background: C.warnBg, border: '2px solid #A3320B', borderRadius: 10, padding: '18px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 400px', minWidth: 0 }}>
            <span id="del-h" style={{ fontSize: 15, fontWeight: 700, color: C.warnText }}>{checkedList.length}과목을 목록에서 삭제할까요?</span>
            <span style={{ fontSize: 13, color: '#2B3038', lineHeight: 1.5 }}>{checkedList.map((s) => s.name).join(', ')}</span>
            <span style={{ fontSize: 12, color: C.muted }}>삭제한 과목은 아래 '삭제한 과목'에 남아서 언제든 복구할 수 있어요.</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setConfirmDel(false)} style={toolBtn}>취소</button>
            <button type="button" onClick={doDelete} style={{ ...toolBtn, border: 0, padding: '0 20px', background: '#A3320B', color: '#fff', fontWeight: 600 }}>삭제</button>
          </div>
        </div>
      )}

      {list.length === 0 ? (
        <div style={{ background: '#fff', border: '1px dashed #A9B1BD', borderRadius: 10, padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{year}년 {I.name} 평가 과목이 아직 없어요</div>
          <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
            {canUpload
              ? '엑셀 업로드로 여러 과목을 한 번에 넣을 수 있어요. 업로드 양식을 받아 한 줄에 1과목씩 적어 올리세요.'
              : '아직 등록된 과목이 없어요. 팀 로그인을 하면 엑셀 업로드로 과목을 넣을 수 있어요.'}
          </div>
          {(canUpload || canEdit) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {canUpload && (
                <button type="button" onClick={() => setShowUp(true)} style={{ ...toolBtn, border: 0, background: C.primary, color: '#fff', fontWeight: 600 }}>
                  <Icon name="upload" />엑셀 업로드
                </button>
              )}
              {canEdit && (
                <button type="button" onClick={() => setForm({ mode: 'add' })} style={toolBtn}>
                  <Icon name="plus" />과목 직접 추가
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          <section aria-label="요약 (누르면 목록이 걸러집니다)" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="mp-cards">
              <SummaryCard id="all" label="전체 평가 과목" value={n.all} sub="두 구분 합계" filter={filter} setFilter={setFilter} />
              <SummaryCard id="신규" label="신규" value={n.신규} sub="기본 최대 15과목 (+ 재평가 포기 수)" swatch={EVAL_STYLE.신규.swatch} filter={filter} setFilter={setFilter} />
              <SummaryCard id="재평가" label="재평가" value={n.재평가} sub="3년 사용 만료 과목" swatch={EVAL_STYLE.재평가.swatch} filter={filter} setFilter={setFilter} />
            </div>
            <div className="mp-cards">
              {['신규촬영', '일부 수정', '재사용'].map((st) => (
                <SummaryCard key={st} id={st} label={st} value={n[st]} sub={split(st)} swatch={STATUS_SWATCH[st]} filter={filter} setFilter={setFilter} />
              ))}
            </div>
          </section>
          <SubjectList key={`${inst}-${year}`} subjects={shown} title={TITLES[filter] || TITLES.all}
            cardFiltered={filter !== 'all'} onClearCard={() => setFilter('all')}
            canEdit={canEdit} checked={checked} setChecked={setChecked} />
        </>
      )}

      {deleted.length > 0 && (
        <section aria-labelledby="trash-h" style={{ background: '#fff', border: '1px dashed #A9B1BD', borderRadius: 10, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="trash-h" style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>삭제한 과목 <span style={{ color: C.muted, fontWeight: 500 }}>{deleted.length}과목</span></h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {deleted.map((s) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${C.line}`, borderRadius: 8, padding: canEdit ? '6px 6px 6px 12px' : '8px 12px', fontSize: 14, minHeight: 36 }}>
                <span style={{ textDecoration: 'line-through', color: C.muted }}>{s.name}</span>
                {canEdit && (
                  <button type="button" onClick={() => restore(s)} aria-label={`${s.name} 복구`}
                    style={{ height: 36, padding: '0 12px', border: `1px solid ${C.primary}`, color: '#1A43A6', background: '#fff', borderRadius: 6, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="restore" size={14} />복구
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {form && canEdit && (form.mode === 'add' || editSubject) && (
        <SubjectForm key={form.mode === 'edit' ? `e${form.id}` : 'add'} subject={editSubject} institute={inst} onClose={closeForm} onSaved={savedForm} />
      )}
    </>
  );
}
