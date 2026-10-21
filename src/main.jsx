import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { supabase, teamLogin, teamLogout } from './lib/supabase.js';
import { currentYear, isYearOpen } from './lib/year.js';
import './styles.css';

// 화면 자리(다음 단계에서 시안대로 채움)
const Placeholder = ({ title }) => <section className="page"><h1>{title}</h1><p>준비 중</p></section>;

function LoginBox({ session }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  if (session) {
    return <button className="btn" onClick={teamLogout}>팀 로그인 · 편집 가능 (로그아웃)</button>;
  }
  return (
    <form className="login" onSubmit={async (e) => {
      e.preventDefault(); setErr('');
      try { await teamLogin(pw); setPw(''); } catch (x) { setErr(x.message); }
    }}>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="팀 비밀번호" aria-label="팀 비밀번호" />
      <button className="btn" type="submit">로그인</button>
      {err && <span className="err" role="alert">{err}</span>}
    </form>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [year, setYear] = useState(currentYear());
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  const canEdit = !!session && isYearOpen(year);
  return (
    <BrowserRouter>
      <header className="top">
        <nav>
          <NavLink to="/">기관별 현황</NavLink>
          <NavLink to="/production">통합 제작현황</NavLink>
          <NavLink to="/course">과목 상세</NavLink>
          <NavLink to="/work">작업 입력</NavLink>
        </nav>
        <div className="year">
          <button onClick={() => setYear(year - 1)} aria-label="이전 연도">◀</button>
          <strong>{year}년</strong>
          <button onClick={() => setYear(year + 1)} aria-label="다음 연도">▶</button>
        </div>
        <LoginBox session={session} />
      </header>
      {!isYearOpen(year) && <div className="banner">{year}년은 잠긴 연도입니다 · 보기 전용</div>}
      <main data-can-edit={canEdit}>
        <Routes>
          <Route path="/" element={<Placeholder title="1. 기관별 평가 현황" />} />
          <Route path="/production" element={<Placeholder title="2. 통합 제작현황" />} />
          <Route path="/course" element={<Placeholder title="3. 과목 상세" />} />
          <Route path="/work" element={<Placeholder title="4. 작업 입력" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
