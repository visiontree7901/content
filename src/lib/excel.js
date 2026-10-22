// 엑셀(.xlsx) 내려받기·읽기
// - 내려받기: exceljs (필요할 때만 불러옴)
// - 읽기: 직접 만든 작은 xlsx 읽기 함수. exceljs는 업로드 양식(메모가 달린 파일)을 읽다가 오류가 나서 쓰지 않음
import { formatSessionList } from './model.js';
import { INSTITUTES } from './constants.js';

export const SHEET_NAME = '과목목록';

/** 업로드 양식과 같은 칸 순서 */
export const COLUMNS = [
  '연도', '교육원', '과목명', '교수명', '평가 구분', '제작 상태', '총 차시', '소유자', '촬영지', '개발년도',
  '최근 평가 결과', '탈락 사유', '렉넘', '웹 폴더', 'CDN 폴더', '재촬영 차시', '재편집 차시', '휴대폰', '이메일', '비고',
];
const WIDTHS = [8, 9, 26, 10, 10, 11, 8, 10, 10, 9, 14, 14, 9, 11, 10, 14, 14, 15, 24, 24];

/** 과목 1개 → 엑셀 1줄(칸 이름 → 값). team=false면 비공개 칸은 비움 */
export function subjectToRow(s, team) {
  const p = s.production;
  const plan = p?.plan || {};
  const pick = (m) => formatSessionList(Object.keys(plan).map(Number).filter((n) => plan[n] === m));
  const isPart = s.prod_status === '일부 수정';
  const priv = team ? s.priv || {} : {};
  return {
    연도: s.year,
    교육원: INSTITUTES[s.institute]?.short || s.institute,
    과목명: s.name,
    교수명: s.professor || '',
    '평가 구분': s.eval_type || '',
    '제작 상태': s.prod_status || '',
    '총 차시': p?.total_sessions || '',
    소유자: s.owner || '',
    촬영지: s.location || '',
    개발년도: s.dev_year || '',
    '최근 평가 결과': s.last_result || '',
    '탈락 사유': s.fail_reason || '',
    렉넘: priv.lecnum || '',
    '웹 폴더': priv.web_folder_new || priv.web_folder_old || '',
    'CDN 폴더': priv.cdn_folder_new || priv.cdn_folder_old || '',
    '재촬영 차시': isPart ? pick('재촬영') : '',
    '재편집 차시': isPart ? pick('재편집') : '',
    휴대폰: priv.phone || '',
    이메일: priv.email || '',
    비고: s.note || '',
  };
}

/** rows(칸 이름 → 값)를 .xlsx로 만들어 내려받기 */
export async function downloadXlsx(rows, filename, { columns = COLUMNS, sheetName = SHEET_NAME, widths = WIDTHS } = {}) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = '평가인정 과목 관리';
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1, xSplit: 3 }] });
  ws.columns = columns.map((c, i) => ({ header: c, key: c, width: widths[i] || 12 }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FF15181D' } };
  head.alignment = { vertical: 'middle' };
  head.height = 20;
  head.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF0F3' } };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FFC9CED6' } } };
  });
  for (const r of rows) ws.addRow(columns.map((c) => (r[c] === undefined || r[c] === null ? '' : r[c])));
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- 읽기 ---------- */

async function openZip(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  const dec = new TextDecoder();
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('엑셀 파일(.xlsx)을 열 수 없어요. 엑셀에서 .xlsx로 저장한 파일인지 확인하세요');
  const count = dv.getUint16(eocd + 10, true);
  let off = dv.getUint32(eocd + 16, true);
  const entries = new Map();
  for (let k = 0; k < count; k++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true);
    const csize = dv.getUint32(off + 20, true);
    const nlen = dv.getUint16(off + 28, true);
    const xlen = dv.getUint16(off + 30, true);
    const clen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = dec.decode(u8.subarray(off + 46, off + 46 + nlen)).replace(/^\//, '');
    entries.set(name.toLowerCase(), { method, csize, lho });
    off += 46 + nlen + xlen + clen;
  }
  return async function read(name) {
    const e = entries.get(String(name).replace(/^\//, '').toLowerCase());
    if (!e) return null;
    const start = e.lho + 30 + dv.getUint16(e.lho + 26, true) + dv.getUint16(e.lho + 28, true);
    const data = u8.subarray(start, start + e.csize);
    let out;
    if (e.method === 0) out = data;
    else if (e.method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error('지원하지 않는 압축 방식이에요');
    return dec.decode(out);
  };
}

const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const all = (node, tag) => Array.from(node.getElementsByTagNameNS('*', tag));
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function resolvePath(base, target) {
  if (target.startsWith('/')) return target.slice(1);
  const parts = base.split('/');
  parts.pop();
  for (const seg of target.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg && seg !== '.') parts.push(seg);
  }
  return parts.join('/');
}

function colIndex(ref) {
  const m = /^([A-Z]+)/i.exec(ref || '');
  if (!m) return -1;
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function textOf(node) {
  // 윗주(rPh) 글자는 빼고 <t> 글자만 이어 붙임
  return all(node, 't').filter((t) => t.parentNode?.localName !== 'rPh').map((t) => t.textContent).join('');
}

/**
 * .xlsx 파일에서 시트 하나 읽기. 1행 = 칸 이름(끝의 ' *' 제거), 2행부터 자료
 * 반환: { headers: [이름], rows: [{ rowNo, cells: { 칸 이름: 값 } }] } (빈 줄 제외)
 */
export async function readXlsxSheet(file, sheetName = SHEET_NAME) {
  const buf = await file.arrayBuffer();
  const read = await openZip(buf);
  const wbPath = 'xl/workbook.xml';
  const wbText = await read(wbPath);
  if (!wbText) throw new Error('엑셀 파일(.xlsx)을 열 수 없어요');
  const wbDoc = xml(wbText);
  const relsText = await read('xl/_rels/workbook.xml.rels');
  const rels = new Map();
  if (relsText) for (const r of all(xml(relsText), 'Relationship')) rels.set(r.getAttribute('Id'), r);
  const sheets = all(wbDoc, 'sheet');
  const sheet = sheets.find((s) => (s.getAttribute('name') || '').trim() === sheetName);
  if (!sheet) throw new Error(`'${sheetName}' 시트를 찾지 못했어요. 업로드 양식을 받아서 작성하세요`);
  const rid = sheet.getAttributeNS(REL_NS, 'id') || sheet.getAttribute('r:id');
  const rel = rels.get(rid);
  if (!rel) throw new Error('시트를 읽지 못했어요');
  const sheetPath = resolvePath(wbPath, rel.getAttribute('Target'));

  let shared = [];
  const ssRel = [...rels.values()].find((r) => /sharedStrings$/.test(r.getAttribute('Type') || ''));
  const ssText = await read(ssRel ? resolvePath(wbPath, ssRel.getAttribute('Target')) : 'xl/sharedStrings.xml');
  if (ssText) shared = all(xml(ssText), 'si').map(textOf);

  const sheetText = await read(sheetPath);
  if (!sheetText) throw new Error('시트를 읽지 못했어요');
  const grid = [];
  let autoRow = 0;
  for (const row of all(xml(sheetText), 'row')) {
    const rn = Number(row.getAttribute('r')) || autoRow + 1;
    autoRow = rn;
    const vals = [];
    let autoCol = -1;
    for (const c of Array.from(row.childNodes).filter((n) => n.localName === 'c')) {
      let ci = colIndex(c.getAttribute('r'));
      if (ci < 0) ci = autoCol + 1;
      autoCol = ci;
      const t = c.getAttribute('t');
      const v = Array.from(c.childNodes).find((n) => n.localName === 'v')?.textContent;
      let val = null;
      if (t === 's') val = v == null ? null : shared[Number(v)] ?? null;
      else if (t === 'inlineStr') val = textOf(c);
      else if (t === 'b') val = v === '1';
      else if (t === 'str' || t === 'e' || t === 'd') val = v ?? null;
      else if (v != null && v !== '') val = Number(v);
      vals[ci] = val;
    }
    grid[rn] = vals;
  }
  const headers = (grid[1] || []).map((h) => String(h ?? '').replace(/\s*\*\s*$/, '').trim());
  const rows = [];
  for (let rn = 2; rn < grid.length; rn++) {
    const vals = grid[rn];
    if (!vals) continue;
    const cells = {};
    let any = false;
    headers.forEach((h, i) => {
      if (!h) return;
      let v = vals[i];
      if (typeof v === 'string') v = v.trim();
      if (v === '' || v === undefined) v = null;
      if (v !== null) any = true;
      cells[h] = v;
    });
    if (any) rows.push({ rowNo: rn, cells });
  }
  return { headers, rows };
}
