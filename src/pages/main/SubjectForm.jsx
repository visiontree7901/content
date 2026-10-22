// 과목 추가·수정 대화상자 (+ 일부 수정 과목의 수정 차시 지정)
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '../../lib/AppContext.jsx';
import * as api from '../../lib/api.js';
import { C, DEFAULT_SESSIONS, EVAL_TYPES, INSTITUTES, PART_COLORS, PART_METHODS, PROD_STATUSES } from '../../lib/constants.js';
import { Field, Modal, inputStyle } from '../../components/ui.jsx';

const big = { ...inputStyle, height: 44, padding: '0 12px' };

function SessionPlanner({ total, plan, setPlan, sharedWith }) {
  const [brush, setBrush] = useState('재촬영');
  const T = Math.max(1, Math.min(40, parseInt(total, 10) || DEFAULT_SESSIONS));
  const cnt = { 재촬영: 0, 재편집: 0 };
  for (let n = 1; n <= T; n++) if (plan[n]) cnt[plan[n]]++;
  const tap = (n) => {
    const next = { ...plan };
    if (next[n] === brush) delete next[n]; else next[n] = brush;
    setPlan(next);
  };
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, background: '#FAFBFC' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '6px 12px' }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>수정할 차시 지정</span>
        <span style={{ fontSize: 13, color: C.muted }}>수정 방법을 고른 뒤 차시를 누르세요. 같은 방법으로 다시 누르면 지워지고, 표시 안 한 차시는 수정 없음(그대로 사용)이에요.</span>
      </div>
      {sharedWith && (
        <span style={{ fontSize: 12, color: C.muted }}>{INSTITUTES[sharedWith].short} 공통 과목이라 {INSTITUTES[sharedWith].short} 과목에도 같이 적용돼요.</span>
      )}
      <div role="radiogroup" aria-label="수정 방법" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PART_METHODS.map((m) => {
          const on = brush === m;
          return (
            <button key={m} type="button" role="radio" aria-checked={on} onClick={() => setBrush(m)}
              style={{ height: 40, padding: '0 14px', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', ...(on ? { background: C.ink, color: '#fff', border: `1px solid ${C.ink}`, fontWeight: 600 } : { background: '#fff', color: '#2B3038', border: `1px solid ${C.line2}` }) }}>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 2, marginRight: 8, verticalAlign: -1, background: PART_COLORS[m] }} />{m}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))', gap: 4 }}>
        {Array.from({ length: T }, (_, i) => i + 1).map((n) => {
          const m = plan[n];
          return (
            <button key={n} type="button" onClick={() => tap(n)} aria-label={`${n}차시 ${m || '수정 없음'}`} aria-pressed={!!m}
              style={{ height: 40, borderRadius: 6, fontFamily: 'inherit', fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums', padding: 0, cursor: 'pointer', ...(m ? { background: PART_COLORS[m], color: '#fff', border: `1px solid ${PART_COLORS[m]}` } : { background: '#fff', color: C.ink, border: `1px solid ${C.line2}` }) }}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', fontSize: 13 }}>
        <span>재촬영 <b>{cnt.재촬영}</b>차시</span>
        <span>재편집 <b>{cnt.재편집}</b>차시</span>
        <span style={{ color: '#8E2B09', fontWeight: 600 }}>자막 수정 {cnt.재촬영 + cnt.재편집}차시 (수정 차시 전체)</span>
      </div>
    </div>
  );
}

const TEXT_FIELDS = ['name', 'professor', 'owner', 'location', 'dev_year', 'last_result', 'fail_reason', 'note'];

function initial(subject) {
  if (!subject) {
    return {
      name: '', professor: '', eval_type: '신규', prod_status: '신규촬영', owner: '', location: '', dev_year: '',
      last_result: '', fail_reason: '', note: '', lecnum: '', web: '', cdn: '', phone: '', email: '',
      total_sessions: String(DEFAULT_SESSIONS),
    };
  }
  const pv = subject.priv || {};
  const out = { eval_type: subject.eval_type || '신규', prod_status: subject.prod_status || '재사용' };
  for (const k of TEXT_FIELDS) out[k] = subject[k] ?? '';
  out.lecnum = pv.lecnum ?? '';
  out.web = pv.web_folder_new || pv.web_folder_old || '';
  out.cdn = pv.cdn_folder_new || pv.cdn_folder_old || '';
  out.phone = pv.phone ?? '';
  out.email = pv.email ?? '';
  out.total_sessions = String(subject.production?.total_sessions || DEFAULT_SESSIONS);
  return out;
}

/** subject가 있으면 수정, 없으면 추가(institute 교육원) */
export default function SubjectForm({ subject, institute, onClose, onSaved }) {
  const { year, isTeam, run } = useApp();
  const init = useMemo(() => initial(subject), [subject]);
  const [f, setF] = useState(init);
  const [plan, setPlan] = useState(() => ({ ...(subject?.production?.plan || {}) }));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((o) => ({ ...o, [k]: e.target.value }));
  const close = useCallback(() => { if (!busy) onClose(); }, [busy, onClose]);

  const total = parseInt(f.total_sessions, 10);
  const totalOk = Number.isInteger(total) && total >= 1 && total <= 40;
  const ready = f.name.trim() && f.professor.trim() && totalOk;
  const isPart = f.prod_status === '일부 수정';
  const cleanPlan = () => Object.fromEntries(Object.entries(plan).filter(([n]) => Number(n) <= total));
  const inst = INSTITUTES[subject ? subject.institute : institute];

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const v = (k) => (typeof f[k] === 'string' ? f[k].trim() : f[k]);
    try {
      if (!subject) {
        const input = {
          year, institute, eval_type: f.eval_type, prod_status: f.prod_status, total_sessions: total,
          plan: isPart ? cleanPlan() : {},
        };
        for (const k of TEXT_FIELDS) input[k] = v(k) || null;
        if (isTeam) {
          input.lecnum = v('lecnum') || null; input.web_folder_new = v('web') || null; input.cdn_folder_new = v('cdn') || null;
          input.phone = v('phone') || null; input.email = v('email') || null;
        }
        await run(() => api.createSubject(input), '과목을 추가했어요');
      } else {
        const patch = {};
        for (const k of [...TEXT_FIELDS, 'eval_type', 'prod_status']) if (v(k) !== (init[k] ?? '')) patch[k] = v(k) || null;
        if (isTeam) {
          const pv = subject.priv || {};
          if (v('lecnum') !== init.lecnum) patch.lecnum = v('lecnum') || null;
          if (v('phone') !== init.phone) patch.phone = v('phone') || null;
          if (v('email') !== init.email) patch.email = v('email') || null;
          // 보이는 값이 나온 칸(새 폴더가 있으면 새 폴더, 없으면 기존 폴더)을 고침
          if (v('web') !== init.web) patch[pv.web_folder_new || !pv.web_folder_old ? 'web_folder_new' : 'web_folder_old'] = v('web') || null;
          if (v('cdn') !== init.cdn) patch[pv.cdn_folder_new || !pv.cdn_folder_old ? 'cdn_folder_new' : 'cdn_folder_old'] = v('cdn') || null;
        }
        if (String(total) !== init.total_sessions) patch.total_sessions = total;
        const oldPlan = subject.production?.plan || {};
        const newPlan = cleanPlan();
        const planChanged = isPart && subject.production_id
          && JSON.stringify(Object.entries(oldPlan).sort()) !== JSON.stringify(Object.entries(newPlan).sort());
        await run(async () => {
          if (Object.keys(patch).length) await api.updateSubject(subject, patch);
          if (planChanged) await api.setPlan(subject.production_id, newPlan);
        }, '저장했어요');
      }
      onSaved?.();
    } catch {
      setBusy(false); // 알림은 run이 띄움. 창은 그대로 둠
    }
  };

  const title = subject ? `과목 수정 · ${subject.name}` : `${year}년 ${inst?.name || ''} 과목 추가`;
  const text = (k, label, props = {}) => (
    <Field label={label} required={k === 'name' || k === 'professor'}>
      <input type="text" value={f[k]} onChange={set(k)} style={big} {...props} />
    </Field>
  );

  return (
    <Modal title={title} onClose={close} width={780}
      footer={(
        <>
          <button type="button" onClick={close} style={{ height: 44, padding: '0 16px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>취소</button>
          <button type="button" onClick={save} disabled={!ready || busy}
            style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, cursor: ready && !busy ? 'pointer' : 'not-allowed', ...(ready && !busy ? { background: C.primary, color: '#fff' } : { background: C.line, color: C.muted }) }}>
            {busy ? '저장하는 중…' : subject ? '저장' : '추가'}
          </button>
        </>
      )}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {subject && <p style={{ margin: 0, fontSize: 13, color: C.muted }}>현재 값이 들어 있어요. 바꿀 칸만 고치고 저장하세요</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '12px 16px' }}>
          {text('name', '과목명', { placeholder: '예) 상담실습' })}
          {text('professor', '교수명', { placeholder: '교수 이름' })}
          <Field label="평가 구분">
            <select value={f.eval_type} onChange={set('eval_type')} style={{ ...big, padding: '0 10px' }}>
              {EVAL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="제작 상태">
            <select value={f.prod_status} onChange={set('prod_status')} style={{ ...big, padding: '0 10px' }}>
              {PROD_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="총 차시" hint="기본 26 · 실습은 직접 입력">
            <input type="number" min="1" max="40" value={f.total_sessions} onChange={set('total_sessions')}
              aria-invalid={!totalOk} style={{ ...big, width: 120, ...(totalOk ? null : { borderColor: C.danger }) }} />
          </Field>
          {text('owner', '소유자', { placeholder: '예) 비전, 건국' })}
          {text('location', '촬영지', { placeholder: '예) 전주, 서울' })}
          {text('dev_year', '개발년도', { placeholder: '예) 2026', inputMode: 'numeric' })}
          {text('last_result', '최근 평가 결과', { placeholder: '예) 25탈락' })}
          {text('fail_reason', '탈락 사유')}
          {isTeam && (
            <>
              {text('lecnum', '렉넘')}
              {text('web', '웹 폴더', { placeholder: '예) 2026/003' })}
              {text('cdn', 'CDN 폴더', { placeholder: '예) 003' })}
              <Field label="휴대폰"><input type="tel" value={f.phone} onChange={set('phone')} placeholder="010-0000-0000" style={big} /></Field>
              <Field label="이메일"><input type="email" value={f.email} onChange={set('email')} placeholder="name@example.com" style={big} /></Field>
            </>
          )}
        </div>
        <Field label="비고">
          <input type="text" value={f.note} onChange={set('note')} style={big} />
        </Field>
        {isPart && <SessionPlanner total={f.total_sessions} plan={plan} setPlan={setPlan} sharedWith={subject?.shared} />}
      </div>
    </Modal>
  );
}
