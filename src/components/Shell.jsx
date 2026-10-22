// 맨 위 메뉴줄(제목·연도 선택·메뉴·팀 로그인) + 잠금 안내 + 알림
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../lib/AppContext.jsx';
import { teamLogin, teamLogout } from '../lib/supabase.js';
import { currentYear } from '../lib/year.js';
import { C } from '../lib/constants.js';
import { Icon, inputStyle } from './ui.jsx';
import { withMock } from '../lib/nav.js';

function YearControl() {
  const { year, setYear, locked } = useApp();
  const now = currentYear();
  const bg = year === now ? '#2B3038' : locked ? '#8E2B09' : '#1A43A6';
  const btn = { width: 40, height: 40, border: 0, background: 'transparent', color: '#fff', borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const notice = year === now ? null : locked ? `${year}년 · 보기 전용 (지난 연도 잠김)` : year < now ? `${year}년 · 2월까지 수정 가능` : `${year}년 데이터 보는 중`;
  return (
    <>
      <div role="group" aria-label="연도 선택" style={{ display: 'flex', alignItems: 'center', gap: 2, borderRadius: 8, padding: 2, background: bg }}>
        <button type="button" style={btn} aria-label="이전 연도" onClick={() => setYear(year - 1)}><Icon name="prev" stroke={2.2} /></button>
        <span aria-live="polite" style={{ minWidth: 64, textAlign: 'center', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{year}년</span>
        <button type="button" style={btn} aria-label="다음 연도" onClick={() => setYear(year + 1)}><Icon name="next" stroke={2.2} /></button>
      </div>
      {notice && (
        <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', ...(locked ? { background: '#FBE7E0', color: '#8E2B09' } : { background: '#E7EEFC', color: '#1A43A6' }) }}>
          {notice}
        </span>
      )}
    </>
  );
}

function Login() {
  const { isTeam, locked } = useApp();
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (isTeam) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#C9CED6' }}>
        <span style={{ background: '#2B3038', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>
          팀 로그인 · {locked ? '보기 전용' : '편집 가능'}
        </span>
        <button type="button" onClick={teamLogout} style={{ border: 0, background: 'transparent', color: '#C9CED6', font: 'inherit', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 8 }}>로그아웃</button>
      </div>
    );
  }
  if (!open) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#C9CED6' }}>
        <span style={{ background: '#2B3038', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12 }}>보기 전용</span>
        <button type="button" onClick={() => setOpen(true)} style={{ height: 36, padding: '0 12px', border: '1px solid #4A525E', background: 'transparent', color: '#fff', borderRadius: 8, font: 'inherit', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="lock" size={14} />팀 로그인
        </button>
      </div>
    );
  }
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setErr(''); setBusy(true);
      try { await teamLogin(pw); setPw(''); setOpen(false); } catch (x) { setErr(x.message); } finally { setBusy(false); }
    }} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} placeholder="팀 비밀번호" aria-label="팀 비밀번호"
        style={{ ...inputStyle, height: 36, width: 150 }} />
      <button type="submit" disabled={busy || !pw} style={{ height: 36, padding: '0 14px', border: 0, background: C.primary, color: '#fff', borderRadius: 8, font: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>로그인</button>
      <button type="button" onClick={() => { setOpen(false); setErr(''); }} aria-label="취소" style={{ height: 36, width: 36, border: 0, background: 'transparent', color: '#C9CED6', cursor: 'pointer' }}><Icon name="close" /></button>
      {err && <span role="alert" style={{ color: '#FFB4A8', fontSize: 12, width: '100%' }}>{err}</span>}
    </form>
  );
}

export default function Shell({ children }) {
  const { year, locked, toast } = useApp();
  const link = ({ isActive }) => ({
    color: isActive ? '#fff' : '#C9CED6', background: isActive ? '#2B3038' : 'transparent', textDecoration: 'none',
    padding: '10px 14px', borderRadius: 6, fontSize: 14, fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap',
  });
  return (
    <div style={{ fontFamily: "'IBM Plex Sans KR', system-ui, sans-serif", color: C.ink, background: C.bg, minHeight: '100vh' }}>
      <header style={{ background: '#15181D', color: '#fff' }}>
        <div className="shell-bar" style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 28px' }}>
          <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>평가인정 과목 관리</div>
          <YearControl />
          <nav aria-label="메뉴" style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <NavLink to={withMock("/")} end style={link}>기관별 현황</NavLink>
            <NavLink to={withMock("/production")} style={link}>통합 제작현황</NavLink>
            <NavLink to={withMock("/work")} style={link}>작업 입력</NavLink>
          </nav>
          <div style={{ marginLeft: 'auto' }}><Login /></div>
        </div>
      </header>
      <main className="shell-main" style={{ maxWidth: 1360, margin: '0 auto', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {locked && (
          <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.warnBg, border: `1px solid ${C.warnLine}`, borderRadius: 10, padding: '12px 16px', fontSize: 14, color: C.warnText }}>
            <Icon name="lock" />
            {year}년 기록은 잠겨 있어요. 지난 연도는 다음 해 2월까지만 수정할 수 있어요.
          </div>
        )}
        {children}
      </main>
      {toast && (
        <div role={toast.tone === 'error' ? 'alert' : 'status'} key={toast.id}
          style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', background: toast.tone === 'error' ? C.danger : '#15181D', color: '#fff', padding: '12px 18px', borderRadius: 10, fontSize: 14, boxShadow: '0 10px 30px rgba(0,0,0,0.25)', zIndex: 60, maxWidth: 'calc(100vw - 32px)' }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
