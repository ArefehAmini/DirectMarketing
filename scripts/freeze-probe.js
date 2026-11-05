/* تشخیص فریز: بعد از شروع کمپین با اکانت بایندشده، آیا main thread زنده می‌ماند؟ */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:3000';
const EMAIL = process.argv[2] || 'freeze-probe@rasaweb.ir';
const PASS = 'Probe12345';

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(25000);
  const log = (...a) => console.log(...a);

  page.on('pageerror', (e) => log('💥 PAGE ERROR:', String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') log('🔴 console.error:', m.text().slice(0, 160)); });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  /* ثبت‌نام / ورود */
  if (await page.getByRole('button', { name: /ساخت حساب/ }).first().isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /ساخت حساب/ }).first().click();
    await page.locator('input').nth(0).fill('فریز پروب');
    await page.locator('input[type=email]').first().fill(EMAIL);
    await page.locator('input[type=password]').nth(0).fill(PASS);
    await page.locator('input[type=password]').nth(1).fill(PASS);
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: /ساخت حساب و ورود/ }).click();
  } else {
    await page.locator('input[type=email]').first().fill(EMAIL);
    await page.locator('input[type=password]').first().fill(PASS);
    await page.getByRole('button', { name: 'ورود به پنل' }).click();
    const body = await page.textContent('body');
    const m = body.match(/نمایش داده می‌شود:\s*(\d{6})/);
    if (m) {
      await page.getByRole('textbox').first().fill(m[1]);
      await page.getByRole('button', { name: /تأیید و ورود/ }).click();
    }
  }
  await page.waitForTimeout(4000);
  log('── logged in');

  /* داده نمونه */
  const sample = page.getByRole('button', { name: /بارگذاری داده نمونه/ }).first();
  if (await sample.isVisible().catch(() => false)) {
    await sample.click();
    await page.waitForTimeout(6000);
    log('── sample loaded');
  }

  /* Worker شبیه‌ساز */
  await page.getByRole('button', { name: /Browser Workers/ }).first().click();
  await page.waitForTimeout(1200);
  for (let i = 0; i < 3; i++) {
    try { await page.getByRole('button', { name: /Worker شبیه.?ساز/ }).first().click({ timeout: 8000 }); break; }
    catch { await page.waitForTimeout(1200); }
  }
  await page.waitForTimeout(5000);
  log('── sim worker created:', (await page.textContent('body')).includes('آنلاین') ? 'online' : 'NOT online');

  /* بایند با JS مستقیم روی دکمه‌های گرید (مقاوم‌تر از click) */
  await page.locator('[data-slot=card]').filter({ hasText: /Worker/ }).first().click({ force: true, timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  const dlg = await page.locator('[role=dialog]').first().isVisible().catch(() => false);
  log('── details dialog:', dlg);
  if (!dlg) {
    await page.getByText(/Worker #/).first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1200);
  }
  await page.locator('[role=tab]').filter({ hasText: 'اکانت' }).first().click({ timeout: 8000 }).catch((e) => log('tab click fail'));
  await page.waitForTimeout(800);
  const boundCount = await page.evaluate(() => {
    let n = 0;
    const btns = [...document.querySelectorAll('button')].filter((b) => b.querySelector('span.font-mono'));
    for (const b of btns.slice(0, 8)) { b.click(); n++; }
    return n;
  });
  log('── bound via JS:', boundCount);
  await page.waitForTimeout(1000);
  for (let i = 0; i < 3; i++) { if (!(await page.locator('[role=dialog]').first().isVisible().catch(() => false))) break; await page.keyboard.press('Escape'); await page.waitForTimeout(500); }

  /* مانیتور زنده‌بود main thread */
  await page.evaluate(() => {
    window.__alive = 0;
    window.__ticks = [];
    setInterval(() => { window.__alive++; window.__ticks.push(Date.now()); if (window.__ticks.length > 200) window.__ticks.shift(); }, 250);
  });

  /* شروع کمپین */
  await page.getByRole('button', { name: /کمپین.{0,2}ها/ }).first().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /شروع ارسال/ }).first().click({ force: true }).catch((e) => log('start click fail:', String(e).slice(0, 80)));
  log('── campaign start clicked');

  /* پایش: هر ۳ ثانیه — alive counter + تعداد وظایف در DB از طریق UI */
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(3000);
    const alive = await page.evaluate(() => ({ a: window.__alive, gaps: (() => { const t = window.__ticks || []; let g = 0; for (let j = 1; j < t.length; j++) if (t[j] - t[j - 1] > 1200) g++; return g; })() })).catch(() => null);
    const bodyOk = await page.textContent('body').then(() => true).catch(() => false);
    log(`t+${(i + 1) * 3}s alive=${alive ? alive.a : 'DEAD'} gaps=${alive ? alive.gaps : '?'} pageResponds=${bodyOk}`);
    if (!bodyOk) break;
  }

  await page.screenshot({ path: '/tmp/freeze-probe.png' });
  await browser.close();
  log('── probe done');
}

main().catch((e) => { console.error('FATAL:', String(e).slice(0, 300)); process.exit(1); });
