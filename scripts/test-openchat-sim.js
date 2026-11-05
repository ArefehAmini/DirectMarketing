// Simulation E2E: fake messenger page + real extension agent.js
// Tests the v1.1.3 openChat fix end-to-end (click bubbling to parent handler,
// delayed search results, composer verify) plus the failure-diagnostics path.
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');

const PAGE_HTML = `<!DOCTYPE html>
<html dir="rtl"><body style="font-family:Tahoma">
<div id="sidebar" style="width:300px;float:right">
  <input id="search" type="search" placeholder="جستجو" />
  <ul id="results" style="list-style:none;padding:0"></ul>
</div>
<div id="main" style="margin-right:320px">
  <div id="chatHeader" style="height:50px;border-bottom:1px solid #ccc"></div>
  <div id="messages" style="height:300px;overflow:auto"></div>
  <div id="composer" contenteditable="true" style="display:none;height:40px;border:1px solid #ccc"></div>
  <button id="sendBtn" style="display:none" onclick="sendMsg()">ارسال</button>
</div>
<script>
  window.__SENT = [];
  window.__OPENED__ = null;
  window.chrome = window.chrome || {};
  chrome.runtime = {
    id: "test-ext",
    lastError: null,
    onMessage: { addListener: function (fn) { (window.__RW_LISTENERS__ = window.__RW_LISTENERS__ || []).push(fn); } },
    sendMessage: function (msg, cb) {
      if (typeof cb === "function") { setTimeout(function () { cb({ ok: false }); }, 10); return; }
      return Promise.resolve({ ok: false });
    },
  };
  document.getElementById("search").addEventListener("input", function () {
    var q = this.value.trim();
    var ul = document.getElementById("results");
    ul.innerHTML = "";
    setTimeout(function () {
      if (!q) return;
      var names = ["حمیدرضا سلیمانی", "مهدی تیره چرخ", "کاربر بی‌ربط"];
      names.forEach(function (n) {
        if (n.indexOf(q) === -1) return;
        var li = document.createElement("li");
        li.setAttribute("role", "listitem");
        li.innerHTML = '<div class="avatar" style="width:30px;height:30px;background:#889;display:inline-block"></div>'
          + '<div class="info" style="display:inline-block"><div class="name">' + n + '</div>'
          + '<div class="last">آخرین پیام دیروز</div></div>';
        li.addEventListener("click", function () { openChat(n); });
        ul.appendChild(li);
      });
    }, 1200);
  });
  function openChat(name) {
    document.getElementById("results").innerHTML = "";
    document.getElementById("chatHeader").innerHTML = '<div class="title">' + name + '</div>';
    document.getElementById("composer").style.display = "block";
    document.getElementById("sendBtn").style.display = "block";
    window.__OPENED__ = name;
  }
  function sendMsg() {
    var c = document.getElementById("composer");
    if (c.innerText.trim()) {
      window.__SENT.push(c.innerText.trim());
      var d = document.createElement("div");
      d.className = "message-out";
      d.textContent = c.innerText.trim();
      document.getElementById("messages").appendChild(d);
      c.innerText = "";
    }
  }
</script>
</body></html>`;

const FAKE_ADAPTER = `
  window.__FAKE_ADAPTER__ = {
    label: "FakeRubika",
    hosts: ["*"],
    support: { sendText: true, sendImage: false, sendFile: false, caption: false, createGroup: false },
    chatTitle() { const el = document.querySelector("#chatHeader .title"); return el ? el.textContent.trim() : ""; },
    chatType() { return "private"; },
    input() { return document.querySelector("#composer"); },
    sendButton() { return document.querySelector("#sendBtn"); },
    attachButton() { return null; },
    fileInput() { return null; },
    lastOutgoing() {
      const els = document.querySelectorAll("#messages .message-out");
      return els.length ? els[els.length - 1] : null;
    },
    searchBox() { return document.querySelector("#search"); },
    loginCheck() { return true; },
  };
  window.__RW_DETECT_ADAPTER__ = function () { return { key: "rubika", adapter: window.__FAKE_ADAPTER__ }; };
`;

async function runTask(page, task) {
  return page.evaluate((t) => {
    return new Promise((resolve) => {
      let answered = false;
      const cb = (res) => { answered = true; resolve(res); };
      for (const fn of window.__RW_LISTENERS__ || []) {
        fn({ type: "RW_TASK", task: t }, {}, cb);
      }
      setTimeout(() => { if (!answered) resolve({ status: "timeout" }); }, 90000);
    });
  }, task);
}

async function main() {
  const browser = await chromium.launch({ headless: true, channel: "chromium", args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.setContent(PAGE_HTML);
  // chrome stub is inside PAGE_HTML before anything else loads
  await page.addScriptTag({ path: "/home/z/my-project/public/extension/content/adapters.js" });
  await page.addScriptTag({ content: FAKE_ADAPTER });
  await page.addScriptTag({ path: "/home/z/my-project/public/extension/content/agent.js" });
  console.log("✔ fake messenger + adapters + agent injected");

  /* ── تست ۱: فلو کامل موفق — جستجو، ورود به دایرکت، ارسال، تأیید ── */
  const r1 = await runTask(page, {
    id: "TASK-SIM-1", refNo: "R-1", platform: "rubika", action: "SEND_TEXT",
    target: "حمیدرضا سلیمانی", payload: { text: "سلام — این پیام تستی است" },
  });
  console.log("TEST-1 (success path):", JSON.stringify(r1));
  const sent = await page.evaluate(() => window.__SENT);
  console.log("TEST-1 messages actually appended in fake chat:", JSON.stringify(sent));
  const opened = await page.evaluate(() => window.__OPENED__);
  console.log("TEST-1 chat actually opened:", opened);

  /* ── تست ۲: مخاطب ناموجود — باید chat_not_found + دیاگنوستیک برگرداند و پیام نرود ── */
  const r2 = await runTask(page, {
    id: "TASK-SIM-2", refNo: "R-2", platform: "rubika", action: "SEND_TEXT",
    target: "نام ناموجود", payload: { text: "نباید برسد" },
  });
  console.log("TEST-2 (missing contact):", JSON.stringify(r2));
  const sent2 = await page.evaluate(() => window.__SENT);
  console.log("TEST-2 messages after missing-contact task:", JSON.stringify(sent2));

  /* ── تست ۳: تعویض گفتگو وقتی گفتگوی قبلی باز است — پیام باید به مخاطب جدید برسد ── */
  const r3 = await runTask(page, {
    id: "TASK-SIM-3", refNo: "R-3", platform: "rubika", action: "SEND_TEXT",
    target: "مهدی تیره چرخ", payload: { text: "پیام برای مخاطب دوم" },
  });
  console.log("TEST-3 (switch chat):", JSON.stringify(r3));
  const sent3 = await page.evaluate(() => window.__SENT);
  const opened3 = await page.evaluate(() => window.__OPENED__);
  console.log("TEST-3 messages:", JSON.stringify(sent3), "| opened:", opened3);

  /* ── تست ۴: شبیه‌سازی «وضعیت فعلی روبیکا» — selector عنوان متن رسمی می‌دهد
     («گفتگوی صوتی») و کادر پیام با selector آداپتر پیدا نمی‌شود (input=null).
     باید با تشخیص عمومی (کادر پایین صفحه + بسته شدن نتایج + نام در نوار بالا)
     وظیفه موفق شود ── */
  await page.evaluate(() => {
    window.__FAKE_ADAPTER__.chatTitle = () => "گفتگوی صوتی"; /* selector عنوان خراب */
    window.__FAKE_ADAPTER__.input = () => null;              /* selector کادر خراب */
  });
  const r4 = await runTask(page, {
    id: "TASK-SIM-4", refNo: "R-4", platform: "rubika", action: "SEND_TEXT",
    target: "کاربر بی‌ربط", payload: { text: "پیام با تشخیص عمومی" },
  });
  console.log("TEST-4 (broken selectors, universal detect):", JSON.stringify(r4));
  const sent4 = await page.evaluate(() => window.__SENT);
  const opened4 = await page.evaluate(() => window.__OPENED__);
  console.log("TEST-4 messages:", JSON.stringify(sent4), "| opened:", opened4);

  const ok1 = r1.status === "success" && (sent || []).some((s) => s.includes("تستی")) && opened === "حمیدرضا سلیمانی";
  const ok2 = r2.status === "failed" && r2.errorKind === "chat_not_found" && (r2.error || "").includes("اشکال‌یابی")
    && !(sent2 || []).some((s) => s.includes("نباید برسد"));
  const ok3 = r3.status === "success" && opened3 === "مهدی تیره چرخ" && (sent3 || []).some((s) => s.includes("مخاطب دوم"));
  const ok4 = r4.status === "success" && opened4 === "کاربر بی‌ربط" && (sent4 || []).some((s) => s.includes("تشخیص عمومی"));
  console.log(ok1 ? "✅ TEST-1 PASS — فلو کامل جستجو→دایرکت→ارسال→تأیید" : "❌ TEST-1 FAIL");
  console.log(ok2 ? "✅ TEST-2 PASS — خطای دیاگنوستیک‌دار، بدون Success کاذب و بدون پیام اشتباه" : "❌ TEST-2 FAIL");
  console.log(ok3 ? "✅ TEST-3 PASS — تعویض گفتگو امن بود" : "❌ TEST-3 FAIL");
  console.log(ok4 ? "✅ TEST-4 PASS — با selectorهای خراب (سناریوی روبیکا) تشخیص عمومی کار کرد" : "❌ TEST-4 FAIL");
  await browser.close();
  process.exit(ok1 && ok2 && ok3 && ok4 ? 0 : 1);
}

main().catch((e) => { console.error("E2E sim crashed:", e); process.exit(1); });
