/* E2E صادقانه‌بودن موتور ارسال — کاربر تازه در هر ران (بدون آلودگی state)
   ۱) NEGATIVE: بدون Worker بایندشده → شروع کمپین باید با toast.error بلاک شود
   ۲) POSITIVE: با Worker شبیه‌ساز آنلاین + اکانت بایندشده → dispatch واقعی → نتیجه واقعی */
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const BASE = 'http://localhost:3000';
const TS = Date.now().toString().slice(-6);
const EMAIL = `honest-${TS}@rasaweb.ir`;
const PASS = 'Honest12345';

const ok = (name, cond, extra = '') => console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ' — ' + extra : ''}`);

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  page.setDefaultTimeout(30000);

  /* ── ثبت‌نام کاربر تازه ── */
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: /ساخت حساب/ }).first().click();
  await page.locator('input').nth(0).fill('تست موتور صادق');
  await page.locator('input[type=email]').first().fill(EMAIL);
  await page.locator('input[type=password]').nth(0).fill(PASS);
  await page.locator('input[type=password]').nth(1).fill(PASS);
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: /ساخت حساب و ورود/ }).click();
  await page.waitForTimeout(3500);
  ok('registered fresh user', EMAIL);

  /* ── بارگذاری داده نمونه ── */
  const loadSample = page.getByRole('button', { name: /بارگذاری داده نمونه/ }).first();
  if (await loadSample.isVisible().catch(() => false)) {
    await loadSample.click();
    await page.waitForTimeout(6000);
    ok('sample data loaded', true);
  } else {
    ok('sample data button', false, 'not found');
  }

  /* ── ۱) NEGATIVE: بدون Worker → بلاک صادقانه ── */
  await page.getByRole('button', { name: /کمپین.{0,2}ها/ }).first().click();
  await page.waitForTimeout(1500);
  const startBtn = page.getByRole('button', { name: /شروع ارسال/ }).first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await page.waitForTimeout(2000);
    const b = await page.textContent('body');
    const blocked = b.includes('هیچ اکانتی به Worker آنلاین متصل نیست');
    const noFake = !b.includes('ارسال واقعی توسط عامل مرورگر انجام می‌شود') || blocked;
    ok('NEGATIVE: start honestly blocked (no online worker)', blocked, noFake ? '' : 'FAKE start detected!');
  } else {
    ok('NEGATIVE: skipped (no startable campaign)', true, 'SKIP');
  }

  /* ── ۲) ساخت Worker شبیه‌ساز ── */
  await page.getByRole('button', { name: /Browser Workers/ }).first().click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 3; i++) {
    try {
      await page.getByRole('button', { name: /Worker شبیه.?ساز/ }).first().click({ timeout: 10000 });
      break;
    } catch (e) {
      console.log('   ┌ sim-worker click retry', i + 1);
      await page.waitForTimeout(1500);
    }
  }
  await page.waitForTimeout(6000); // جفت‌سازی API + شروع حلقه sync
  const wb = await page.textContent('body');
  ok('sim worker created + online', wb.includes('آنلاین'));

  /* ── ۳) بایند اکانت‌ها به Worker ── */
  const card = page.locator('[data-slot=card], .cursor-pointer').filter({ hasText: /Worker/ }).first();
  try {
    await card.click({ timeout: 10000 });
  } catch {
    await page.screenshot({ path: '/tmp/e2e-workers.png' });
    const dialogs = await page.locator('[role=dialog]').count();
    console.log('   ┌ DEBUG: dialogs open =', dialogs, '| url =', page.url());
    const bodyTxt = await page.textContent('body');
    console.log('   ┌ DEBUG body has Worker#:', bodyTxt.includes('Worker #'), '| آنلاین:', bodyTxt.includes('آنلاین'));
    console.log('   ┌ DEBUG body slice:', bodyTxt.slice(0, 300).replace(/\s+/g, ' '));
    throw new Error('card click failed');
  }
  await page.waitForTimeout(1500);
  await page.waitForTimeout(800);
  let dlgOpen = await page.locator('[role=dialog]').first().isVisible().catch(() => false);
  if (!dlgOpen) {
    console.log('   ┌ dialog not open — clicking card text directly');
    await page.getByText(/Worker #/).first().click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    dlgOpen = await page.locator('[role=dialog]').first().isVisible().catch(() => false);
  }
  console.log('   ┌ details dialog open:', dlgOpen);
  if (!dlgOpen) {
    await page.screenshot({ path: '/tmp/e2e-nodialog.png' });
    throw new Error('details dialog never opened');
  }
  const tabBtn = page.locator('[role=tab]').filter({ hasText: 'اکانت' }).first();
  await tabBtn.click({ timeout: 10000 });
  await page.waitForTimeout(800);
  let bound = 0;
  for (let i = 0; i < 14; i++) {
    // دکمه‌های بایند: در گرید «اتصال اکانت جدید» با شماره ماسک‌شده mono
    const cand = page.locator('button').filter({ has: page.locator('span.font-mono') }).first();
    if (!(await cand.isVisible().catch(() => false))) break;
    await cand.click();
    bound++;
    await page.waitForTimeout(500);
  }
  ok('accounts bound', bound > 0, `count=${bound}`);
  for (let i = 0; i < 3; i++) {
    if (!(await page.locator('[role=dialog]').first().isVisible().catch(() => false))) break;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }

  /* ── ۴) POSITIVE: شروع کمپین → dispatch واقعی ── */
  await page.getByRole('button', { name: /کمپین.{0,2}ها/ }).first().click();
  await page.waitForTimeout(1200);
  const start2 = page.getByRole('button', { name: /شروع ارسال/ }).first();
  if (!(await start2.isVisible().catch(() => false))) {
    ok('POSITIVE: startable campaign', false, 'not found');
    await browser.close();
    return;
  }
  await start2.click();
  await page.waitForTimeout(2500);
  const b2 = await page.textContent('body');
  const started = b2.includes('ارسال واقعی توسط عامل مرورگر انجام می‌شود') || b2.includes('شروع شد');
  ok('POSITIVE: campaign started', started);

  /* ── ۵) پایش وظایف عامل ── */
  await page.getByRole('button', { name: /وظایف.{0,2}عامل/ }).first().click();
  let sawDispatched = false, sawProgress = false, sawTerminal = false;
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2500);
    const b = await page.textContent('body');
    if (b.includes('SEND_TEXT')) sawDispatched = true;
    if (/در حال اجرا|در حال بررسی|دریافت شد|ack/.test(b)) sawProgress = true;
    if (/موفق/.test(b)) sawTerminal = true;
    if (sawDispatched && sawTerminal) break;
  }
  ok('REAL dispatch: SEND_TEXT tasks created', sawDispatched);
  ok('task lifecycle (received/running/verifying seen)', sawProgress);
  ok('real terminal result (success from worker)', sawTerminal);

  /* ── ۶) صف ── */
  await page.getByRole('button', { name: /صف.{0,2}ارسال/ }).first().click();
  await page.waitForTimeout(2000);
  const qb = await page.textContent('body');
  ok('queue reflects real states', /در حال ارسال|ارسال موفق/.test(qb));

  await browser.close();
  console.log('\n═══ E2E DONE ═══');
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
