// 엑셀 업로드 칸: 양식 받기 → 파일 선택 → 미리보기(줄마다 확인 결과) → 등록
import { useRef, useState } from 'react';
import { useApp } from '../../lib/AppContext.jsx';
import * as api from '../../lib/api.js';
import { buildModel } from '../../lib/model.js';
import { readXlsxSheet } from '../../lib/excel.js';
import { INSTITUTES, C } from '../../lib/constants.js';
import { Icon } from '../../components/ui.jsx';
import { analyzeRows, toCreateInput } from './upload.js';
import { isYearOpen } from '../../lib/year.js';

const GRID = '60px 64px minmax(160px, 1.6fr) 80px 72px 84px 56px minmax(140px, 1.2fr) minmax(200px, 1.4fr)';
const cell = { padding: 8, minWidth: 0, overflowWrap: 'anywhere' };
const BADGE = {
  new: { background: '#E2F3EC', color: '#0B5A42' },
  same: { background: '#E7EEFC', color: '#1A43A6' },
  dup: { background: '#FFF8EC', color: '#6B4A0B' },
  filedup: { background: '#FFF8EC', color: '#6B4A0B' },
  err: { background: '#FBE7E0', color: '#8E2B09' },
};
const btn = { height: 44, padding: '0 16px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' };

function resultText(u) {
  if (u.kind === 'err') return `오류 · ${u.rowNo}행 · ${u.errors.join(', ')}`;
  if (u.kind === 'dup') return '이미 있음(건너뜀)';
  if (u.kind === 'filedup') return '파일 안에 같은 줄 있음(건너뜀)';
  if (u.kind === 'same') return '새 과목 · 같은 이름 과목 있음(정보 다름)';
  return '새 과목';
}

function planText(d) {
  if (d.prod_status !== '일부 수정') return '';
  const pick = (m) => Object.keys(d.plan).map(Number).filter((n) => d.plan[n] === m);
  const fmt = (l) => (l.length ? l.join(',') : '-');
  return `재촬영 ${fmt(pick('재촬영'))} / 재편집 ${fmt(pick('재편집'))}`;
}

export default function UploadPanel({ onClose }) {
  const { locked, isTeam, model, run } = useApp();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [doneMsg, setDoneMsg] = useState('');
  const inputRef = useRef(null);

  const getSubjects = async (y) => {
    if (model && y === model.year) return model.active;
    // 다른 연도: 수정 차시까지 비교해야 해서 한 해 전체를 불러옴(비공개 정보 포함)
    const raw = await api.loadYear(y, isTeam);
    return buildModel(raw).active;
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    setErr(''); setDoneMsg(''); setRows(null);
    setFileName(f ? f.name : '');
    if (!f) return;
    setBusy(true);
    try {
      const sheet = await readXlsxSheet(f);
      const res = await analyzeRows(sheet.rows, getSubjects, { isYearOpen });
      if (!res.length) setErr('파일에 등록할 줄이 없어요. 2행의 예시 행 아래(3행부터)에 과목을 적으세요');
      setRows(res);
    } catch (x) {
      setErr(x.message || '파일을 읽지 못했어요');
    } finally {
      setBusy(false);
    }
  };

  const ok = (rows || []).filter((u) => u.kind === 'new' || u.kind === 'same');
  const dup = (rows || []).filter((u) => u.kind === 'dup' || u.kind === 'filedup').length;
  const bad = (rows || []).filter((u) => u.kind === 'err').length;

  const register = async () => {
    if (!ok.length) return;
    setBusy(true);
    const cnt = { V: 0, K: 0 };
    try {
      await run(async () => {
        for (const u of ok) {
          await api.createSubject(toCreateInput(u.data));
          cnt[u.data.institute]++;
        }
      }, `${ok.length}과목을 등록했어요`);
      setDoneMsg(`등록 완료 · 비전 ${cnt.V}과목, 건국 ${cnt.K}과목${dup ? ` · 같은 과목 ${dup}건 건너뜀` : ''}${bad ? ` · 오류 ${bad}건 제외` : ''}`);
      setRows(null); setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    } catch {
      // 알림은 run이 띄움. 일부만 들어갔을 수 있으니 다시 확인하도록 파일을 다시 읽게 함
      setDoneMsg(cnt.V + cnt.K ? `${cnt.V + cnt.K}과목까지 등록하고 멈췄어요. 파일을 다시 선택하면 남은 줄을 확인할 수 있어요` : '');
      setRows(null); setFileName('');
      if (inputRef.current) inputRef.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="up-h" style={{ background: '#fff', border: `2px solid ${C.primary}`, borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px 12px', flexWrap: 'wrap' }}>
        <h2 id="up-h" style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>엑셀 업로드</h2>
        <span style={{ fontSize: 13, color: C.muted, flex: '1 1 260px' }}>양식의 '연도' 칸 기준으로 연도별로 나뉘어 들어가요. 여러 해를 한 파일에 넣어도 돼요.</span>
        <button type="button" onClick={onClose} aria-label="닫기" style={{ marginLeft: 'auto', width: 40, height: 40, border: 0, background: 'transparent', borderRadius: 6, cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 24px', fontSize: 14 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <b>①</b> 양식 받기
          <a href="/upload-template.xlsx" download="평가과목_업로드_양식.xlsx"
            style={{ height: 36, padding: '0 12px', border: `1px solid ${C.line2}`, background: '#fff', borderRadius: 6, fontSize: 13, color: C.ink, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="download" size={14} />평가과목_업로드_양식.xlsx
          </a>
        </span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
          <b>②</b> 작성한 파일 선택
          <input ref={inputRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={onFile} disabled={busy}
            style={{ fontFamily: 'inherit', fontSize: 13, maxWidth: '100%' }} />
        </label>
      </div>
      {locked && (
        <div style={{ background: C.bg, borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#2B3038' }}>
          잠긴 지난 연도라도 엑셀 업로드로는 과목을 넣을 수 있어요 (지난 자료 정리용). 넣은 뒤에는 보기 전용이에요.
        </div>
      )}
      {busy && !rows && <div role="status" style={{ fontSize: 14, color: C.subtle }}>파일을 확인하는 중…</div>}
      {err && <div role="alert" style={{ background: C.dangerBg, color: C.danger, borderRadius: 8, padding: '10px 14px', fontSize: 14 }}>{err}</div>}
      {doneMsg && <div role="status" style={{ background: '#E2F3EC', color: '#0B5A42', borderRadius: 8, padding: '10px 14px', fontSize: 14, fontWeight: 600 }}>{doneMsg}</div>}
      {rows && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 16px', fontSize: 14 }}>
            <span style={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{fileName}</span>
            <span style={{ padding: '3px 10px', borderRadius: 999, background: '#E2F3EC', color: '#0B5A42', fontWeight: 600 }}>등록 가능 {ok.length}</span>
            <span style={{ padding: '3px 10px', borderRadius: 999, background: '#FFF8EC', color: '#6B4A0B', fontWeight: 600 }}>완전히 같은 과목 {dup} (건너뜀)</span>
            <span style={{ padding: '3px 10px', borderRadius: 999, background: '#FBE7E0', color: '#8E2B09', fontWeight: 600 }}>오류 {bad}</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>모든 정보가 똑같을 때만 같은 과목으로 봐요. 이름만 같고 교수 등이 다르면 새로 등록돼요.</span>
          </div>
          <div className="scroll-x" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
            <div role="table" aria-label="업로드 미리보기" style={{ minWidth: 900, fontSize: 13 }}>
              <div role="row" style={{ display: 'grid', gridTemplateColumns: GRID, background: '#F8F9FA', color: C.muted, borderBottom: `1px solid ${C.line}` }}>
                {['연도', '교육원', '과목명', '교수명', '평가 구분', '제작 상태', '차시', '수정 차시', '확인 결과'].map((h) => (
                  <div key={h} role="columnheader" style={{ ...cell, fontWeight: 600 }}>{h}</div>
                ))}
              </div>
              {rows.map((u) => (
                <div key={u.rowNo} role="row" data-kind={u.kind} style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: '1px solid #EEF0F3', alignItems: 'center' }}>
                  <div role="cell" style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{u.data.year || '—'}</div>
                  <div role="cell" style={cell}>{INSTITUTES[u.data.institute]?.short || '—'}</div>
                  <div role="cell" style={{ ...cell, fontWeight: 600 }}>{u.data.name || '—'}</div>
                  <div role="cell" style={cell}>{u.data.professor || '—'}</div>
                  <div role="cell" style={cell}>{u.data.eval_type || '—'}</div>
                  <div role="cell" style={cell}>{u.data.prod_status || '—'}</div>
                  <div role="cell" style={cell}>{u.data.total_sessions || '—'}</div>
                  <div role="cell" style={{ ...cell, color: C.muted }}>{planText(u.data)}</div>
                  <div role="cell" style={cell}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', ...BADGE[u.kind] }}>{resultText(u)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={onClose} style={btn}>취소</button>
            <button type="button" onClick={register} disabled={busy || !ok.length}
              style={{ ...btn, border: 0, padding: '0 20px', fontWeight: 600, ...(ok.length && !busy ? { background: C.primary, color: '#fff' } : { background: C.line, color: C.muted, cursor: 'not-allowed' }) }}>
              {busy ? '등록하는 중…' : `${ok.length}과목 등록`}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
