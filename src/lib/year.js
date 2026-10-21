// 연도 잠금 규칙 (DB의 is_year_open과 같음): 올해·다음 연도 열림, 지난 연도는 다음 해 2월 말까지
export function isYearOpen(year, now = new Date()) {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const y = kst.getFullYear();
  const m = kst.getMonth() + 1;
  return year >= y || (year === y - 1 && m <= 2);
}

export function currentYear(now = new Date()) {
  return Number(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul', year: 'numeric' }));
}
