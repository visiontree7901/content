// 통합 제작현황 화면에서 쓰는 계산 도움 함수
import { byName } from '../../lib/model.js';

/** 삭제 안 된 과목이 하나라도 있는 제작 묶음(가나다순) */
export function liveProductions(model) {
  const out = [];
  for (const p of model.productions.values()) {
    const live = p.subjects.filter((s) => !s.deleted_at);
    if (!live.length) continue;
    // 비전 과목을 앞에 두어 링크·교육원 표시 순서를 맞춤
    live.sort((a, b) => (a.institute === b.institute ? a.id - b.id : a.institute === 'V' ? -1 : 1));
    out.push({ p, live, insts: [...new Set(live.map((s) => s.institute))] });
  }
  return out.sort((a, b) => byName(a.p, b.p));
}

/** 촬영지: 연결된 과목의 촬영지를 겹치지 않게 이어 붙임 */
export function locationOf(live) {
  const list = [...new Set(live.map((s) => (s.location || '').trim()).filter(Boolean))];
  return list.length ? list.join(', ') : '[미입력]';
}

/** 가장 최근 작업 메모 본문 */
export function latestWorkMemo(p) {
  return p.notes.find((n) => n.kind === '작업메모' && n.body)?.body || '';
}

export const pad2 = (n) => (n < 10 ? '0' : '') + n;
