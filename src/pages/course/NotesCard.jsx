// 카드 2·4: 교수 소통 내용(kind '교수소통') / 작업 메모(kind '작업메모', 상태 있음)
import { useState } from 'react';
import { C, NOTE_STATUSES, TEAM } from '../../lib/constants.js';
import { fmtDate } from '../../lib/model.js';
import * as api from '../../lib/api.js';
import { PeoplePicker } from '../../components/ui.jsx';
import { addBtn, card360, h2Style, h2Sub, miniBtn, muted, smallLink, textareaStyle } from './styles.js';

const STATUS_BG = { '작업 대기': '#4A525E', 작업중: '#1F4FBF', 작업완료: '#0F6B4F' };

const whoStyle = (who, small) => ({
  fontWeight: 600, borderRadius: 4, whiteSpace: 'nowrap',
  ...(small ? { fontSize: 11, padding: '1px 6px' } : { padding: '2px 8px' }),
  ...(who === '기존 시트' ? { background: '#F1F3F5', color: C.muted } : { background: '#E7EEFC', color: '#1A43A6' }),
});

function whenText(n) {
  const base = fmtDate(n.created_at);
  const edited = n.updated_at && n.created_at && new Date(n.updated_at) - new Date(n.created_at) > 60 * 1000;
  return edited ? `${base} · 수정됨 ${fmtDate(n.updated_at)}` : base;
}

/** 작업 상태 3칸 (작업 대기 / 작업중 / 작업완료), 고른 칸은 색으로 채움 */
export function StatusGroup({ value, onPick, disabled, label = '작업 상태' }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', flexShrink: 0, border: `1px solid ${C.line2}`, borderRadius: 4, overflow: 'hidden' }}>
      {NOTE_STATUSES.map((s, k) => {
        const on = value === s;
        return (
          <button key={s} type="button" aria-pressed={on} disabled={disabled} onClick={() => !on && onPick(s)}
            style={{
              height: 22, padding: '0 5px', border: 0, font: 'inherit', fontSize: 10, lineHeight: 1, whiteSpace: 'nowrap',
              cursor: disabled ? 'default' : 'pointer',
              ...(k > 0 ? { borderLeft: `1px solid ${C.line2}` } : null),
              ...(on ? { background: STATUS_BG[s], color: '#FFFFFF', fontWeight: 600 } : { background: '#FFFFFF', color: C.muted, fontWeight: 400 }),
            }}>
            {s}
          </button>
        );
      })}
    </div>
  );
}

export default function NotesCard({ p, kind, canEdit, run }) {
  const isWork = kind === '작업메모';
  const notes = (p?.notes || []).filter((n) => n.kind === kind);
  const [who, setWho] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState('작업 대기');
  const [editing, setEditing] = useState(null); // { id, author, body }
  const [deleting, setDeleting] = useState(null); // id
  const [busy, setBusy] = useState(false);

  const save = async (fn, msg) => {
    setBusy(true);
    try { await run(fn, msg); return true; } catch { return false; } finally { setBusy(false); }
  };

  const ready = !!(who.trim() && text.trim()) && !busy;
  const add = async () => {
    if (!ready || !p) return;
    const ok = await save(() => api.addNote({ productionId: p.id, kind, author: who.trim(), body: text.trim(), status: isWork ? status : null }), '저장했어요');
    if (ok) { setText(''); setStatus('작업 대기'); }
  };
  const saveEdit = async () => {
    if (!editing?.body.trim()) return;
    const n = notes.find((x) => x.id === editing.id);
    const ok = await save(() => api.updateNote(editing.id, { author: editing.author.trim() || n?.author || null, body: editing.body.trim() }), '저장했어요');
    if (ok) setEditing(null);
  };
  const doDelete = async (id) => {
    const ok = await save(() => api.deleteNote(id), '삭제했어요');
    if (ok) setDeleting(null);
  };
  const onCtrlEnter = (fn) => (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fn(); } };

  const title = isWork ? '작업 메모' : '교수 소통 내용';
  const hid = isWork ? 'wm-h' : 'ct-h';
  const short = (s) => (s.length > 20 ? `${s.slice(0, 20)}…` : s);

  const renderTools = (n) => canEdit && (
    <span style={{ marginLeft: isWork ? 0 : 'auto', display: 'flex', gap: 2 }}>
      <button type="button" aria-label={`${short(n.body)} 수정`} disabled={busy}
        onClick={() => { setEditing({ id: n.id, author: n.author || '', body: n.body }); setDeleting(null); }} style={smallLink('#1A43A6')}>수정</button>
      <button type="button" aria-label={`${short(n.body)} 삭제`} disabled={busy}
        onClick={() => { setDeleting(n.id); setEditing(null); }} style={smallLink('#A3320B')}>삭제</button>
    </span>
  );

  const renderBody = (n) => {
    if (editing?.id === n.id) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'flex-start' }}>
          <input type="text" aria-label="담당자 수정" value={editing.author} onChange={(e) => setEditing({ ...editing, author: e.target.value })}
            style={{ width: 90, height: 32, padding: '0 8px', border: `1px solid ${C.line2}`, borderRadius: 6, font: 'inherit', fontSize: 12, boxSizing: 'border-box' }} />
          <textarea aria-label="내용 수정" rows={2} value={editing.body} autoFocus
            onChange={(e) => setEditing({ ...editing, body: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); else onCtrlEnter(saveEdit)(e); }}
            style={{ ...textareaStyle, minWidth: 140, border: `1px solid ${C.primary}` }} />
          <span style={{ display: 'flex', gap: 6 }}>
            <button type="button" onClick={saveEdit} disabled={busy || !editing.body.trim()} style={miniBtn(true)}>저장</button>
            <button type="button" onClick={() => setEditing(null)} style={miniBtn(false)}>취소</button>
          </span>
        </div>
      );
    }
    if (deleting === n.id) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', background: C.warnBg, borderRadius: 6, padding: '6px 8px', fontSize: 12, color: C.warnText }}>
          <span style={{ flex: 1 }}>이 기록을 삭제할까요?</span>
          <button type="button" onClick={() => doDelete(n.id)} disabled={busy} style={{ ...miniBtn(true), height: 30, background: '#A3320B' }}>삭제</button>
          <button type="button" onClick={() => setDeleting(null)} style={{ ...miniBtn(false), height: 30 }}>취소</button>
        </div>
      );
    }
    return <div style={{ fontSize: 13, lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{n.body}</div>;
  };

  return (
    <section aria-labelledby={hid} style={card360}>
      <h2 id={hid} style={h2Style}>{title}{isWork && <> <span style={h2Sub}>다음에 할 일</span></>}</h2>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: isWork ? 0 : 8 }}>
        {notes.length === 0 && <p style={muted}>{isWork ? '다음에 할 일을 적어 두세요.' : '아직 기록이 없어요.'}</p>}
        {notes.map((n) => (isWork ? (
          <div key={n.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, borderBottom: '1px solid #EEF0F3', padding: '7px 0' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 11, color: C.subtle }}>
              {n.author && <span style={whoStyle(n.author, true)}>{n.author}</span>}
              <span>{whenText(n)}</span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <StatusGroup value={n.status || '작업 대기'} disabled={!canEdit || busy}
                  onPick={(s) => save(() => api.updateNote(n.id, { status: s }), '저장했어요')} />
                {renderTools(n)}
              </span>
            </div>
            {renderBody(n)}
          </div>
        ) : (
          <div key={n.id} style={{ border: '1px solid #EEF0F3', borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <span style={{ color: C.muted }}>담당자</span>
              {n.author ? <span style={whoStyle(n.author)}>{n.author}</span> : <span style={{ color: C.subtle }}>—</span>}
              <span style={{ color: C.subtle }}>{whenText(n)}</span>
              {renderTools(n)}
            </div>
            {renderBody(n)}
          </div>
        )))}
      </div>
      {canEdit && p && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid #EEF0F3', paddingTop: 10 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: C.muted, marginRight: 2 }}>담당자</span>
            <PeoplePicker value={who} onChange={setWho} people={TEAM} label={isWork ? '작업 메모 담당자' : '교수 소통 담당자'} />
            {isWork && (
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: C.muted }}>상태</span>
                <StatusGroup value={status} onPick={setStatus} label="새 메모 상태" />
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
            <textarea rows={2} aria-label={isWork ? '작업 메모 내용' : '소통 내용'} value={text}
              placeholder={isWork ? '예) 1강 자막 제작' : '예) 일정 조율 통화, 11/3 촬영 확정'}
              onChange={(e) => setText(e.target.value)} onKeyDown={onCtrlEnter(add)} style={textareaStyle} />
            <button type="button" onClick={add} disabled={!ready} aria-disabled={!ready} style={addBtn(ready)}>추가</button>
          </div>
        </div>
      )}
    </section>
  );
}
