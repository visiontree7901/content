import { createClient } from '@supabase/supabase-js';

// 공개용 주소와 키(브라우저에 노출되어도 되는 값). 데이터 보호는 DB의 RLS 권한이 담당
export const SUPABASE_URL = 'https://dyiemvgotuodlgjnvzxj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_yWIoSt-4j0rmqNiBisvF7A_GE4vcUsw';

// 팀 공용 계정 — 로그인 화면에서는 비밀번호만 입력
export const TEAM_EMAIL = 'visiontree7901+content@gmail.com';

// 개발 중 점검용: 주소에 ?mock=1 을 붙이면 가짜 데이터로 동작(배포본에는 가짜 데이터가 포함되지 않음)
let client = null;
export async function getClient() {
  if (client) return client;
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('mock')) {
    const { createMockClient } = await import('./mock.js');
    client = await createMockClient();
  } else {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}

export async function teamLogin(password) {
  const sb = await getClient();
  const { error } = await sb.auth.signInWithPassword({ email: TEAM_EMAIL, password });
  if (error) throw new Error('비밀번호가 맞지 않습니다');
}

export async function teamLogout() {
  const sb = await getClient();
  await sb.auth.signOut();
}
