// 개발 점검 중(?mock=1)에는 링크에 mock 표시를 유지
export function withMock(path) {
  if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('mock')) return path;
  return path + (path.includes('?') ? '&' : '?') + 'mock=1';
}

export const courseUrl = (subjectId) => withMock(`/course?subject=${subjectId}`);
export const workUrl = (subjectId) => withMock(subjectId ? `/work?subject=${subjectId}` : '/work');
