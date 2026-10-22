// 점검용: node scripts/shot.mjs <경로> <저장파일.png> [폭] [높이] [login]
// 예: node scripts/shot.mjs "/?mock=1" /tmp/main.png 1440 1500 login
// dev 서버가 떠 있어야 함(기본 http://localhost:5173, 다른 포트면 BASE=http://localhost:5174 로 지정). login 을 주면 비밀번호 test 로 팀 로그인
import { chromium } from 'playwright';
const [, , path = '/?mock=1', out = '/tmp/shot.png', w = '1440', h = '1000', login] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const base = process.env.BASE || 'http://localhost:5173';
if (login) {
  await page.goto(base + '/?mock=1');
  await page.getByRole('button', { name: '팀 로그인' }).click();
  await page.getByLabel('팀 비밀번호').fill('test');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForTimeout(300);
}
await page.goto(base + path);
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: true });
const sw = await page.evaluate(() => document.documentElement.scrollWidth);
console.log(JSON.stringify({ out, scrollWidth: sw, viewport: Number(w), errors }));
await browser.close();
