// 공통 상수 — 화면 전체에서 같은 이름·색을 쓰기 위해 한 곳에 모음

export const INSTITUTES = {
  V: { code: 'V', name: '비전원격평생교육원', short: '비전', one: '비', color: '#1d62af', text: '#1d62af', bg: '#E8EFF8' },
  K: { code: 'K', name: '건국사이버평생교육원', short: '건국', one: '건', color: '#2c7e2e', text: '#236826', bg: '#E6F2E6' },
};

export const EVAL_TYPES = ['신규', '재평가'];
export const EVAL_STYLE = {
  신규: { bg: '#DDF2F2', text: '#0A6363', swatch: '#0F8585' },
  재평가: { bg: '#EEF0F3', text: '#3A414C', swatch: '#3A414C' },
};

export const PROD_STATUSES = ['신규촬영', '일부 수정', '재사용', '타기관 임대'];
export const LEASED = '타기관 임대';
// 제작 묶음의 종류: 연결된 과목 중 일이 많은 쪽을 따름
export const PROD_RANK = { 신규촬영: 4, '일부 수정': 3, '타기관 임대': 2, 재사용: 1 };

// 신규촬영 공정 6개
export const NEW_STAGES = ['원고', 'PPT', '촬영', '편집', 'xml', '자막'];
// 일부 수정 공정 3개
export const PART_STAGES = ['재촬영', '재편집', '자막'];
export const PART_METHODS = ['재촬영', '재편집'];
export const PART_COLORS = { 재촬영: '#1F4FBF', 재편집: '#C2570C', 자막: '#0F6B4F' };

export const CHECK_ITEMS = ['수업계획서', '콘텐츠제작자료', '쪽지·토론·과제', '중간고사', '기말고사', '최종 탑재'];
// 일부 수정 과목에서 보여줄 진행 단계 체크(3개)
export const CHECK_ITEMS_PART = ['수업계획서', '중간고사', '최종 탑재'];

// 타기관 임대 과목에서 받는 자료(각각 따로 체크)
export const RECEIPT_ITEMS = ['수업계획서', '교수자료', '콘텐츠관리대장', '학습영상', '교안', '자막', '스토리보드', '쪽지, 토론, 과제', '중간고사', '기말고사'];

export const NOTE_STATUSES = ['작업 대기', '작업중', '작업완료'];
export const TEAM = ['강창용', '임동규', '이지형', '김가림'];

export const DEFAULT_SESSIONS = 26;

// 색 토큰(시안과 같은 값)
export const C = {
  ink: '#15181D', muted: '#4A525E', subtle: '#6B7380', line: '#E2E5EA', line2: '#C9CED6',
  bg: '#F4F5F7', card: '#FFFFFF', primary: '#1F4FBF', primaryDark: '#163A8C',
  danger: '#B42318', dangerBg: '#FEF3F2', warnBg: '#FFF4EF', warnLine: '#E8B9A6', warnText: '#8E2B09',
  done: '#1F4FBF', none: '#E2E5EA',
};
