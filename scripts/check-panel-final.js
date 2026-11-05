/* بررسی سلامت اجرای پنل پس از تغییرات: بارگذاری، خطاهای کنسول، تم بوت */
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + String(e).slice(0, 200)));

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1500);

  const theme = await page.evaluate(() => document.documentElement.dataset.theme || "(none)");
  const dark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
  const hasLogin = await page.locator("text=ورود").first().isVisible().catch(() => false);
  const title = await page.title();

  console.log("title:", title);
  console.log("data-theme:", theme, "| dark class:", dark);
  console.log("login visible:", hasLogin);
  console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");

  /* تغییر تم از طریق localStorage و رفرش — شبیه‌سازی انتخاب کاربر */
  await page.evaluate(() => localStorage.setItem("rw-theme", "continental"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  const t2 = await page.evaluate(() => ({
    theme: document.documentElement.dataset.theme,
    dark: document.documentElement.classList.contains("dark"),
    bg: getComputedStyle(document.body).backgroundColor,
  }));
  console.log("after set continental →", JSON.stringify(t2));
  await page.evaluate(() => localStorage.removeItem("rw-theme"));

  await page.screenshot({ path: "scripts/verify/final-login.png" });
  await browser.close();
  console.log("DONE");
})();
