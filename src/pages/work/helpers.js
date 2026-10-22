// 작업 입력 화면 전용 도움 함수
import { byName, formatSessionList, isTodayKST, stagesOf } from '../../lib/model.js';
import { INSTITUTES } from '../../lib/constants.js';

const INST_ORDER = { V: 0, K: 1 };

/** 제작 묶음의 살아 있는 과목(비전 → 건국 순) */
export function liveSubjects(p) {
  return p.subjects.filter((s) => !s.deleted_at).sort((a, b) => INST_ORDER[a.institute] - INST_ORDER[b.institute]);
}

/** 입력할 작업이 있는 제작 묶음(신규촬영·일부 수정)만, 가나다순 */
export function workProductions(model) {
  const out = [];
  for (const p of model.productions.values()) {
    if (p.kind !== '신규촬영' && p.kind !== '일부 수정') continue;
    if (!liveSubjects(p).length) continue;
    out.push(p);
  }
  return out.sort(byName);
}

/**
 * 교육원별 값 줄: 두 교육원 값이 같으면 한 줄, 다르면 '비/건' 배지를 붙여 두 줄
 * 반환 [{ inst: 'V'|'K'|null, text }]
 */
export function instLines(p, field) {
  const subs = liveSubjects(p);
  const vals = subs.map((s) => s[field] || '—');
  if (subs.length < 2 || vals.every((v) => v === vals[0])) return [{ inst: null, text: vals[0] || '—' }];
  return subs.map((s, i) => ({ inst: s.institute, text: vals[i] }));
}

export function devYears(p) {
  const v = [...new Set(liveSubjects(p).map((s) => s.dev_year).filter(Boolean))];
  return v.join(' / ') || '—';
}

export function instNames(p) {
  return liveSubjects(p).map((s) => INSTITUTES[s.institute]?.short).filter(Boolean).join('·');
}

export function defaultStage(p) {
  const st = stagesOf(p);
  return st.includes('촬영') ? '촬영' : st[0];
}

/** 오늘(한국 시간) 입력한 작업 기록, 최신순 */
export function todayLogs(model) {
  const out = [];
  for (const p of model.productions.values()) {
    for (const l of p.logs) if (isTodayKST(l.created_at)) out.push({ ...l, production: p });
  }
  return out.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id));
}

export const sessionText = (list) => formatSessionList(list || []).replace(/,/g, ', ');

export function timeKST(iso) {
  return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date(iso));
}

export function todayLabelKST(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(now);
  const g = (t) => parts.find((x) => x.type === t)?.value;
  const wd = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' }[g('weekday')];
  return `${g('month')}월 ${g('day')}일 (${wd})`;
}
