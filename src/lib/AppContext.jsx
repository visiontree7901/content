// 앱 전체 상태: 연도, 팀 로그인 여부, 한 해 데이터(model), 다시 불러오기, 알림
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getClient } from './supabase.js';
import { loadYear } from './api.js';
import { buildModel } from './model.js';
import { currentYear, isYearOpen } from './year.js';

const Ctx = createContext(null);

function initialYear() {
  try { const v = Number(localStorage.getItem('year')); if (v >= 2020 && v <= 2100) return v; } catch { /* 무시 */ }
  return currentYear();
}

export function AppProvider({ children }) {
  const [year, setYearState] = useState(initialYear);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const reqId = useRef(0);

  const setYear = useCallback((y) => {
    setYearState(y);
    try { localStorage.setItem('year', String(y)); } catch { /* 무시 */ }
  }, []);

  useEffect(() => {
    let unsub = () => {};
    getClient().then(async (sb) => {
      const { data } = await sb.auth.getSession();
      setSession(data.session);
      setAuthReady(true);
      const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
      unsub = () => sub.subscription.unsubscribe();
    });
    return () => unsub();
  }, []);

  const isTeam = !!session;
  const reload = useCallback(async () => {
    const id = ++reqId.current;
    setError('');
    try {
      const raw = await loadYear(year, isTeam);
      if (id === reqId.current) setModel(buildModel(raw));
    } catch (e) {
      if (id === reqId.current) setError(e.message || '데이터를 불러오지 못했습니다');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [year, isTeam]);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    reload();
  }, [authReady, reload]);

  const notify = useCallback((text, tone = 'ok') => {
    setToast({ text, tone, id: Date.now() });
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  /** 저장 함수 실행 → 성공 시 다시 불러오고 알림. 실패 시 오류 알림 */
  const run = useCallback(async (fn, okText) => {
    try {
      const r = await fn();
      await reload();
      if (okText) notify(okText);
      return r;
    } catch (e) {
      notify(e.message || '저장하지 못했습니다', 'error');
      throw e;
    }
  }, [reload, notify]);

  const open = isYearOpen(year);
  const value = useMemo(() => ({
    year, setYear, session, isTeam, authReady,
    locked: !open, canEdit: isTeam && open, canUpload: isTeam,
    model, loading, error, reload, run, notify, toast,
  }), [year, setYear, session, isTeam, authReady, open, model, loading, error, reload, run, notify, toast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error('AppProvider 밖에서 useApp 사용');
  return v;
}
