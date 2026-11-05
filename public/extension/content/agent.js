/* ═══════════════════════════════════════════════════════════
   RasaWeb Agent — Content Script (Browser Agent)
   چرخه عامل: Perceive → Understand → Decide → Act → Verify → Report
   فقط عملیات مجاز و پشتیبانی‌شده — هرگز دور زدن موانع امنیتی (§۵۰)
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";
  if (window.__RW_AGENT_INJECTED__) return;
  window.__RW_AGENT_INJECTED__ = true;

  const detectAdapter = window.__RW_DETECT_ADAPTER__;
  const Adapters = window.__RW_ADAPTERS__;

  let working = false;

  /* ═══════ Perceive — استخراج Context صفحه (§۱۱) ═══════ */
  function getContext() {
    const detected = detectAdapter();
    const adapter = detected?.adapter ?? null;
    const context = {
      ok: true,
      platform: detected?.key ?? "other",
      platformLabel: adapter?.label ?? "Unknown",
      url: location.href,
      title: document.title,
      chatName: "",
      chatType: "unknown",
      session: "active",
      working,
      availableActions: [],
    };

    if (adapter) {
      context.chatName = adapter.chatTitle() || "";
      context.chatType = adapter.chatType(document) || "unknown";
      context.session = adapter.loginCheck() === false ? "expired" : "active";
      context.availableActions = Object.entries(adapter.support)
        .filter(([, v]) => v)
        .map(([k]) => k);
    }

    return context;
  }

  /* گزارش context به Service Worker — برای Side Panel و Heartbeat */
  function reportContext() {
    const ctx = getContext();
    try {
      chrome.runtime.sendMessage({ type: "RW_CONTEXT_UPDATE", context: ctx }).catch(() => {});
    } catch {
      /* SW در حالت sleep */
    }
  }

  /* ═══════ Safety Layer (§۳۰) ═══════ */
  function safetyCheck(task, ctx) {
    const reasons = [];
    if (ctx.session === "expired") reasons.push("نشست اکانت منقضی است");
    if (ctx.platform !== task.platform) reasons.push("پلتفرم صفحه با پلتفرم وظیفه مطابقت ندارد");
    /* توجه: باز نبودن گفتگو مانع اجرا نیست — باز کردن گفتگوی مقصد (openChat)
       دقیقاً وظیفه خود عامل است؛ اگر پیدا نشود خطای chat_not_found گزارش می‌شود */
    return { pass: reasons.length === 0, reasons };
  }

  /* ═══════ Verify — تأیید واقعی ارسال (§۱۳) ═══════
     هرگز فقط با «وجود حباب خروجی» Success ثبت نمی‌کنیم؛
     باید یک حباب خروجیِ «جدید» (متفاوت از قبل از ارسال) ظاهر شود و
     متن آن شامل پیام باشد — وگرنه send_not_verified */
  const OUT_SELECTORS = [
    ".message-out", "[class*='message-out']", "div[data-id*='out']",
    ".bubble.is-out", ".message.out",
    "[class*='message--out']", "[class*='outgoing']",
  ];

  function outgoingSnapshot(adapter) {
    const els = [];
    const seen = new Set();
    for (const sel of OUT_SELECTORS) {
      try {
        document.querySelectorAll(sel).forEach((e) => {
          if (!seen.has(e)) { seen.add(e); els.push(e); }
        });
      } catch { /* selector نامعتبر */ }
    }
    /* فال‌بک آداپتر (bale/eitaa/soroush) */
    if (!els.length) {
      const last = adapter.lastOutgoing?.();
      if (last) els.push(last);
    }
    return els;
  }

  function normText(s) {
    return (s || "")
      .replace(/[\u200c\u200e\u200f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function captureBefore(adapter) {
    const els = outgoingSnapshot(adapter);
    return { count: els.length, lastEl: els.length ? els[els.length - 1] : null };
  }

  function verifyNewOutgoing(adapter, payloadText, before) {
    const els = outgoingSnapshot(adapter);
    const last = els.length ? els[els.length - 1] : adapter.lastOutgoing?.() || null;
    if (!last) return null;
    /* حباب جدید = المانِ آخر تغییر کرده یا تعداد بیشتر شده */
    const isNew = before.lastEl ? last !== before.lastEl : els.length > before.count;
    if (!isNew && els.length <= before.count) return null;
    if (payloadText) {
      const target = normText(payloadText);
      if (target && !normText(last.innerText).includes(target)) return null;
    }
    return last;
  }

  /* ═══════ Agent Overlay — «عامل در حال کار است» (§۵۶) ═══════ */
  function ensureOverlay() {
    let ov = document.getElementById("rw-agent-overlay");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "rw-agent-overlay";
    ov.dir = "rtl";
    ov.style.cssText = [
      "position:fixed", "bottom:16px", "left:16px", "z-index:2147483646",
      "width:290px", "background:#0f172a", "color:#e2e8f0",
      "border-radius:14px", "box-shadow:0 12px 40px rgba(0,0,0,.35)",
      "font-family:Vazirmatn,Tahoma,sans-serif", "font-size:12px",
      "padding:14px", "display:none",
    ].join(";");
    ov.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span id="rw-ov-dot" style="width:8px;height:8px;border-radius:50%;background:#14b8a6"></span>
        <b style="font-size:12px">RasaWeb Agent در حال کار</b>
        <button id="rw-ov-close" style="margin-right:auto;background:none;border:0;color:#94a3b8;cursor:pointer;font-size:14px;line-height:1">×</button>
      </div>
      <div id="rw-ov-steps" style="display:flex;flex-direction:column;gap:5px"></div>
      <div id="rw-ov-foot" style="margin-top:10px;display:none;gap:6px"></div>
    `;
    document.documentElement.appendChild(ov);
    ov.querySelector("#rw-ov-close").addEventListener("click", () => (ov.style.display = "none"));
    return ov;
  }

  function overlayShow() {
    const ov = ensureOverlay();
    ov.style.display = "block";
    return ov;
  }

  function overlaySteps(steps) {
    const ov = ensureOverlay();
    const box = ov.querySelector("#rw-ov-steps");
    box.innerHTML = "";
    for (const s of steps) {
      const row = document.createElement("div");
      row.style.cssText = "display:flex;align-items:center;gap:6px;color:" + (s.state === "done" ? "#6ee7b7" : s.state === "failed" ? "#fda4af" : s.state === "active" ? "#5eead4" : "#64748b");
      const icon = s.state === "done" ? "✓" : s.state === "failed" ? "✕" : s.state === "active" ? "•" : "○";
      row.innerHTML = `<span style="font-weight:700">${icon}</span><span>${s.label}</span>`;
      box.appendChild(row);
    }
  }

  function overlayError(friendly, advice) {
    const ov = ensureOverlay();
    const box = ov.querySelector("#rw-ov-steps");
    box.innerHTML = `<div style="color:#fda4af;font-weight:700;margin-bottom:4px">${friendly}</div>
      <div style="color:#94a3b8;line-height:1.6">${advice}</div>`;
  }

  function overlayHide(delay = 1600) {
    setTimeout(() => {
      const ov = document.getElementById("rw-agent-overlay");
      if (ov) ov.style.display = "none";
    }, delay);
  }

  function defaultSteps() {
    return [
      { key: "find", label: "پیدا کردن گفتگو", state: "pending" },
      { key: "input", label: "تشخیص کادر پیام", state: "pending" },
      { key: "prepare", label: "آماده‌سازی پیام", state: "pending" },
      { key: "send", label: "ارسال", state: "pending" },
      { key: "verify", label: "بررسی نتیجه", state: "pending" },
    ];
  }

  function setStep(steps, key, state, detail) {
    const s = steps.find((x) => x.key === key);
    if (s) {
      s.state = state;
      if (detail) s.detail = detail;
    }
    overlaySteps(steps);
  }

  /* ═══════ تابع کمکی: انتظار برای ظهور عنصر — مقاوم در برابر خطای fn ═══════
     اگر fn پرتاب خطا کند و catch نشود، callback هر tick می‌میرد و timeout هرگز
     اجرا نمی‌شود → Promise هیچ‌وقت resolve نمی‌شود → زنجیره وظایف SW برای همیشه
     قفل می‌شد (دقیقاً عامل وظایف زامبی). پس خطاها بی‌صدا نادیده گرفته می‌شوند. */
  function waitFor(fn, timeoutMs = 6000, interval = 300) {
    return new Promise((resolve) => {
      const started = Date.now();
      const timer = setInterval(() => {
        let el = null;
        try { el = fn(); } catch { /* تلاش بعدی */ }
        if (el) { clearInterval(timer); resolve(el); return; }
        if (Date.now() - started > timeoutMs) { clearInterval(timer); resolve(null); }
      }, interval);
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ═══════ Executerها — اجرای Universal Actionها (§۲۰) ═══════ */

  /* ارسال متن و یا کپشن از طریق کادر پیام واقعی UI
     inputOverride: وقتی selector آداپتر با DOM نمی‌خواند، کادرِ یافت‌شده به‌روش
     عمومی (findComposer) مستقیم پاس داده می‌شود */
  /* ارسال متن — استراتژی چندلایه (v1.1.7+ / بازسازی v1.2.5):
     ① دکمهٔ فعال → deepClick  ② کلیک مورد اعتماد مرورگر (chrome.debugger)
     ③ Enter سینتتیک (توالی کامل)  ④ دکمهٔ دیرفعال‌شده (انتظار فعال شدن)
     سنجش موفقیت در هر لایه: حباب جدید ظاهر شد یا کادر پیام خالی شد —
     هرگز بدون مدرک ok برنمی‌گردد (فیکس Success کاذب) */
  async function typeAndSend(adapter, text, inputOverride, before) {
    const input = await waitFor(() => inputOverride || adapter.input(), 5000);
    if (!input) return { ok: false, errorKind: "input_not_found", error: "کادر پیام پیدا نشد — احتمالاً ساختار UI تغییر کرده", snapshot: domSnapshotDebug(adapter) };

    input.focus();
    /* ورود متن با execCommand برای فریم‌ورک‌های SPA */
    if (input.contentEditable === "true" || input.isContentEditable) {
      document.execCommand("insertText", false, text);
    } else {
      const setter = Object.getOwnPropertyDescriptor(input.constructor.prototype, "value")?.set;
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    await sleep(500);

    const composerHasText = () => {
      try {
        const el = (adapter.input && adapter.input()) || input;
        return normText((el && (el.innerText || el.value)) || "").length > 0;
      } catch { return true; }
    };
    const bubbleNow = () => {
      try { return !!verifyNewOutgoing(adapter, text, before || { count: 0, lastEl: null }); } catch { return false; }
    };
    const trustedClick = (x, y) =>
      new Promise((resolve) => {
        try {
          const timer = setTimeout(() => resolve(null), 4000);
          chrome.runtime.sendMessage({ type: "RW_TRUSTED_CLICK", x, y }, (resp) => {
            clearTimeout(timer);
            resolve(chrome.runtime.lastError ? null : resp || null);
          });
        } catch { resolve(null); }
      });

    /* ① دکمهٔ فعال → کلیک عمیق */
    let btn = adapter.sendButton();
    if (btn && !btn.disabled) {
      deepClick(btn);
      await sleep(900);
      if (bubbleNow() || !composerHasText()) return { ok: true, via: "button" };
    }
    /* ② کلیک مورد اعتماد مرورگر روی دکمه */
    btn = (adapter.sendButton && adapter.sendButton()) || btn;
    if (btn) {
      try {
        const r = btn.getBoundingClientRect();
        const resp = await trustedClick(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
        if (resp?.ok) {
          await sleep(1100);
          if (bubbleNow() || !composerHasText()) return { ok: true, via: "trusted-click" };
        }
      } catch { /* ادامه */ }
    }
    /* ③ Enter سینتتیک — توالی کامل برای UIهایی که روی keyup گوش می‌دهند */
    for (const type of ["keydown", "keypress", "keyup"]) {
      input.dispatchEvent(new KeyboardEvent(type, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true }));
    }
    await sleep(1100);
    if (bubbleNow() || !composerHasText()) return { ok: true, via: "enter" };
    /* ④ دکمهٔ دیرفعال‌شده — انتظار فعال شدن تا ۴ ثانیه و کلیک مجدد */
    const lateBtn = await waitFor(() => {
      const b = adapter.sendButton();
      return b && !b.disabled ? b : null;
    }, 4000, 300);
    if (lateBtn) {
      deepClick(lateBtn);
      await sleep(1100);
      if (bubbleNow() || !composerHasText()) return { ok: true, via: "late-button" };
    }
    /* هیچ روشی پیام را نفرستاد — ok کاذب ممنوع */
    return { ok: false, errorKind: "send_button_missing", error: "هیچ‌یک از روش‌های ارسال (دکمه/کلیک مرورگر/Enter) پیام را نفرستاد — کادر پیام همچنان حاوی متن است", snapshot: domSnapshotDebug(adapter) };
  }

  /* آپلود فایل/عکس از طریق file input واقعی UI */
  async function uploadFile(adapter, blob, fileName, caption) {
    const attach = adapter.attachButton?.();
    if (attach) { try { attach.click(); } catch {} await sleep(800); }
    const fileInput = await waitFor(() => adapter.fileInput(), 4000);
    if (!fileInput) return { ok: false, errorKind: "upload_failed", error: "File Picker پیدا نشد" };

    const file = blob instanceof File ? blob : new File([blob], fileName, { type: blob?.type || "application/octet-stream" });
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    await sleep(1800);

    /* کپشن در Preview (§۱۸) */
    if (caption) {
      const previewInput = await waitFor(() => adapter.input(), 5000);
      if (previewInput) {
        previewInput.focus();
        if (previewInput.isContentEditable) document.execCommand("insertText", false, caption);
        else {
          previewInput.value = caption;
          previewInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        await sleep(400);
      }
    }

    let btn = adapter.sendButton();
    if (btn && !btn.disabled) { btn.click(); }
    else {
      const inp = adapter.input();
      inp?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
    }
    await sleep(1200);
    return { ok: true };
  }

  function makePlaceholderBlob(name) {
    /* نمونه placeholder — در نسخه‌های بعدی فایل از پنل stream می‌شود */
    const content = "RasaWeb Agent — attachment placeholder for " + name;
    return new Blob([content], { type: "text/plain" });
  }

  /* نرمال‌سازی فارسی برای مقایسه نام‌ها — ي/ی، ك/ک، اعراب، نیم‌فاصله و فاصله‌ها */
  function normFa(s) {
    return (s || "")
      .replace(/\u200c/g, " ")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isVisEl(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    return !!(el.offsetParent || el.getClientRects().length);
  }

  /* کلیک واقعی با توالی کامل رویدادها — برخی UIها (واتساپ/بله/روبیکا) به
     mousedown/pointerdown گوش می‌دهند و el.click() خالی اثر ندارد */
  function deepClick(el) {
    try {
      const r = el.getBoundingClientRect();
      const opts = {
        bubbles: true, cancelable: true, view: window,
        clientX: r.x + r.width / 2, clientY: r.y + r.height / 2,
        button: 0,
      };
      if (typeof PointerEvent === "function") {
        el.dispatchEvent(new PointerEvent("pointerdown", opts));
        el.dispatchEvent(new PointerEvent("pointerup", opts));
      }
      el.dispatchEvent(new MouseEvent("mousedown", opts));
      el.dispatchEvent(new MouseEvent("mouseup", opts));
      el.dispatchEvent(new MouseEvent("click", opts));
      return true;
    } catch {
      try { el.click(); return true; } catch { return false; }
    }
  }

  /* آیا کادر پیام (composer) باز و قابل مشاهده است؟ = یک گفتگو باز است */
  function composerVisible(adapter) {
    const input = adapter.input?.();
    return !!(input && isVisEl(input));
  }

  /* ═══════ یافتن کادر پیام به‌روش «عمومی» — مستقل از کلاس‌های UI ═══════
     آداپترها selector اختصاصی دارند؛ اگر با DOM فعلی سرویس نخوانند (مثل روبیکا که
     کلاس‌های obfuscate‌شده دارد)، این روش پشتیبان، هر contenteditable/textarea
     قابل‌مشاهده‌ای را می‌یابد که کادر جستجو نباشد — کادر پیام همیشه پایین‌ترین
     فیلد متنیِ صفحه است (بیشترین y). */
  function findComposer(adapter, searchEl) {
    const viaAdapter = adapter?.input?.();
    if (viaAdapter && isVisEl(viaAdapter)) {
      if (!(searchEl && (viaAdapter === searchEl || searchEl.contains(viaAdapter) || viaAdapter.contains(searchEl)))) {
        return viaAdapter;
      }
    }
    let best = null;
    let bestY = -Infinity;
    /* (v1.2.7) contenteditable="" (خالی = ویرایش‌پذیر با ارث‌بری) هم پوشش داده
       می‌شود — در DOM واقعی روبیکا، کادر پیام با contenteditable خالی ثبت شده
       و فقط selector سخت‌گیرانهٔ ='true' آن را از دست می‌داد */
    for (const el of document.querySelectorAll("[contenteditable]:not([contenteditable='false']), textarea")) {
      if (!isVisEl(el)) continue;
      if (el.closest("#rw-agent-overlay")) continue;
      if (searchEl && (el === searchEl || searchEl.contains(el) || el.contains(searchEl))) continue;
      const y = el.getBoundingClientRect().y;
      if (y > bestY) { bestY = y; best = el; }
    }
    return best;
  }

  /* نام مخاطب در نوار بالای صفحه؟ (سیگنال مستقل از selector عنوان)
     بعد از باز شدن گفتگو، کشوی نتایج بسته می‌شود و تنها جایِ نام مخاطب در
     بالای صفحه، عنوان خود گفتگوست */
  function topStripHasTarget(target) {
    const wanted = normFa(target);
    if (!wanted) return false;
    const words = wanted.split(" ").filter((w) => w.length >= 3);
    for (const el of document.querySelectorAll("body *")) {
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
      if (el.children.length > 6) continue;
      if (!isVisEl(el)) continue;
      if (el.closest("#rw-agent-overlay")) continue;
      if (el.isContentEditable) continue;
      const r = el.getBoundingClientRect();
      if (r.y > 150 || r.height > 90 || r.height < 8) continue;
      const t = normFa(el.innerText);
      if (!t || t.length > 60) continue;
      if (t.includes(wanted) || (words.length && words.every((w) => t.includes(w)))) return true;
    }
    return false;
  }

  /* ═══════ Dump ساختاری DOM برای عیب‌یابی از راه دور ═══════
     در شکستِ openChat/input، فیلدهای متنی + عناصر عنوان‌مانند + تعداد iframe
     ثبت می‌شود تا selector آداپتر بدون دسترسی به دستگاه کاربر دقیق شود. */
  function domSnapshotDebug(adapter) {
    try {
      const ce = [];
      for (const el of document.querySelectorAll("[contenteditable]:not([contenteditable='false']), textarea")) {
        if (!isVisEl(el) || ce.length >= 6) continue;
        const r = el.getBoundingClientRect();
        ce.push({
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 48),
          role: el.getAttribute("role") || "",
          ph: String(el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "").slice(0, 24),
          y: Math.round(r.y),
        });
      }
      const heads = [];
      for (const sel of ["header h4", "header h1", "header .title", "header [class*='title']", "[class*='header'] [class*='title']"]) {
        try {
          const el = document.querySelector(sel);
          if (el && isVisEl(el)) heads.push({ sel, txt: (el.innerText || "").slice(0, 28), cls: String(el.className || "").slice(0, 40) });
        } catch { /* selector نامعتبر */ }
        if (heads.length >= 4) break;
      }
      return JSON.stringify({ fr: document.querySelectorAll("iframe").length, ce, hd: heads, tx: sampleSmallTexts(null, 4), u: location.href.slice(-60) }).slice(0, 1200);
    } catch { return "{}"; }
  }

  /* تطبیق عنوان گفتگو با هدف — با نرمال‌سازی فارسی و کلمات معنادار (≥۳ حرف)
     تطبیق سخت‌گیرانه: متن کامل یا «همه» کلمات — تک‌کلمه‌ایِ ناقص ممنوع */
  function chatMatchesTarget(adapter, target) {
    const title = normFa(adapter.chatTitle());
    if (!title) return false;
    const wanted = normFa(target);
    const words = wanted.split(" ").filter((w) => w.length >= 3);
    return title.includes(wanted) || (words.length >= 2 && words.every((w) => title.includes(w)));
  }

  /* نمونه‌برداری از متن‌های کوچک قابل‌مشاهده (بدون شرط تطبیق) — برای دیاگنوستیک:
     اگر تطبیق نتایج شکست خورد، بفهمیم رابط جستجوی پلتفرم دقیقاً چه چیزی نشان داده است */
  function sampleSmallTexts(searchEl, limit = 6) {
    const out = [];
    try {
      for (const el of document.querySelectorAll("body *")) {
        if (out.length >= limit) break;
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
        if (el.children.length > 10 || !isVisEl(el)) continue;
        if (searchEl && (el === searchEl || searchEl.contains(el) || el.contains(searchEl))) continue;
        if (el.closest("#rw-agent-overlay")) continue;
        if (el.isContentEditable) continue;
        if (el.closest("header, nav, [role='banner'], [class*='composer'], [class*='message']")) continue;
        const t = (el.innerText || "").replace(/\s+/g, " ").trim();
        if (!t || t.length > 60) continue;
        if (RESULT_NOISE.test(t)) continue;
        if (out.some((o) => o.includes(t) || t.includes(o))) continue;
        out.push(t);
      }
    } catch { /* ignore */ }
    return out;
  }

  /* ⭐ نویزهای شناخته‌شده — هرگز کاندیدِ «نتیجه جستجو» نیستند:
     ردیف‌های سیستمی (بایگانی/اپ/پیام جدید)، وضعیت‌های بارگذاری، و ردیف‌های
     «جستجوی ... در پیام‌ها» که ارقامِ کوئری را در متن خود دارند و کلیکشان
     به صفحهٔ جستجوی سراسری می‌رود نه به گفتگوی مخاطب */
  const RESULT_NOISE = /بایگانی|آرشیو|archived|پیام جدید|گفتگوی جدید|چت جدید|new chat|گفتگوی صوتی|تماس صوتی|کانال‌های پیشنهادی|اپلیکیشن|مینی ?اپ|mini ?app|ساخت گروه|افزودن مخاطب|دعوت دوستان|پیام‌های ذخیره|ذخیره‌شده|نتیجه‌ای یافت نشد|نتیجه‌ای پیدا نشد|یافت نشد|پیدا نشد|no result|برقراری ارتباط|در حال اتصال|در حال بارگذاری|connecting|loading|جستجو در|جستجوی|search in|search for|دریچه/i;

  /* سرفصل‌های بخش‌های کشوی جستجو — ردیف نیستند و کلیکشان بی‌اثر است */
  const RESULT_SECTIONS = /^(چت‌ها|چت ها|پیام‌ها|پیام ها|کاربران|مخاطبین|کانال‌ها|گروه‌ها|پروفایل‌ها|نتایج سراسری|جستجوی سراسری|سراسری|همه|چت‌های شما|users|chats|messages|channels|groups|all|global)$/i;

  /* آیا خود عنصر یا یکی از حداکثر ۴ والدش cursor:pointer دارد؟ — نشانهٔ ردیفِ قابل‌کلیک لیست */
  function hasCursorPointer(el, depth = 4) {
    let cur = el;
    for (let i = 0; cur && cur !== document.body && i < depth; i++) {
      try { if (window.getComputedStyle(cur).cursor === "pointer") return true; } catch { return false; }
      cur = cur.parentElement;
    }
    return false;
  }

  /* متن‌های قابل‌مشاهدهٔ ستونِ کادر جستجو (زیر آن) — «قبل از تایپ».
     این‌ها لیست چت معمولی پشت کشوی نتایج‌اند؛ بعد از تایپ، هر ردیفِ تازه‌ای که
     در همین ستون ظاهر شود = نتیجهٔ جستجو (برای تفکیک در دیاگنوستیک نگه داشته می‌شود) */
  function snapshotColumnTexts(searchEl) {
    const set = new Set();
    try {
      if (!searchEl) return set;
      const sr = searchEl.getBoundingClientRect();
      const colL = sr.x - 70;
      const colR = sr.x + sr.width + 70;
      for (const el of document.querySelectorAll("body *")) {
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
        if (el.children.length > 10) continue;
        if (!isVisEl(el)) continue;
        if (el === searchEl || searchEl.contains(el) || el.contains(searchEl)) continue;
        if (el.closest("#rw-agent-overlay")) continue;
        if (el.closest("header, nav, [class*='composer'], [class*='message']")) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 24 || r.height < 12 || r.height > 90) continue;
        if (r.x < colL || r.x + r.width > colR) continue;
        if (r.y <= sr.bottom + 4) continue;
        const t = normFa(el.innerText).replace(/\s+/g, " ").trim();
        if (t && t.length <= 60) set.add(t);
      }
    } catch { /* ignore */ }
    return set;
  }

  /* جمع‌کردن کاندیدهای «نتیجه جستجو» — مستقل از نام کلاس‌ها:
     ⭐ کادر جستجو و فرزندانش حذف می‌شوند (باگ «وارد دایرکت نمیشه»).
     ⭐⭐ تطبیق «تک‌کلمه‌ای» ممنوع — یا متن کامل هدف یا «همه» کلمات معنادار.
     ⭐⭐⭐ نویزها/سرفصل‌ها هرگز کاندید نیستند.
     حالت شماره: تطبیق ارقام نرمال‌شده (کامل یا ۹ رقم آخر) در خود عنصر یا
     ردیفِ والدِ قابل‌کلیک (روبیکا برای مخاطب ذخیره‌نشده: ردیف = نام + شماره).
     ⭐⭐⭐⭐ کلیکِ کورکورانه ممنوع (باگ «اشتباهی میره تو کانالا») — هیچ ردیفِ
     بدون هویتِ تأییدشده (ارقام شماره/نام نمایشی) کاندید نمی‌شود. */
  function collectResultCandidates(target, searchEl, extraTerms = [], preTexts = null) {
    const wanted = normFa(target);
    if (!wanted) return [];
    const targetDigits = normalizePhone(target);
    const phoneMode = targetDigits.length >= 10;
    const phoneTail = phoneMode && targetDigits.length >= 9 ? targetDigits.slice(-9) : "";
    const altList = (extraTerms || []).map((x) => normFa(x)).filter(Boolean);

    const matches = [];
    for (const el of document.querySelectorAll("body *")) {
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
      if (el.children.length > 10) continue; /* کانتینرهای بزرگ */
      if (!isVisEl(el)) continue;
      /* خودِ کادر جستجو (input/contentEditable) و والد/فرزندانش هرگز کاندید نیستند */
      if (searchEl && (el === searchEl || searchEl.contains(el) || el.contains(searchEl))) continue;
      /* پوشش وضعیت عامل (رویِ RasaWeb) هرگز کاندید نیست */
      if (el.closest("#rw-agent-overlay")) continue;
      /* هدر چت باز/منو/کادر پیام نباید قاطی نتایج شود */
      if (el.closest("header, nav, [role='banner'], [class*='chatHeader'], [class*='ChatHeader'], [class*='chat-header'], [class*='composer'], [class*='message']")) continue;
      /* فیلدهای متنی فعال (مثل خود جستجو اگر contentEditable باشد) */
      if (el.isContentEditable) continue;
      const t = normFa(el.innerText);
      if (!t || t.length > 150) continue; /* فقط آیتم‌های کوچک لیست — نه کل ستون */
      if (RESULT_NOISE.test(t) || RESULT_SECTIONS.test(t)) continue;
      const termHit = (term) => {
        const tw = term.split(" ").filter((w) => w.length >= 3);
        return t.includes(term) || (tw.length >= 2 && tw.every((w) => t.includes(w)));
      };
      let hit = false;
      if (phoneMode) {
        const td = normalizePhone(t);
        hit = (!!targetDigits && td.includes(targetDigits)) || (!!phoneTail && td.includes(phoneTail));
        /* ردیف کامل (نام + شماره): شماره در والدِ قابل‌کلیک است */
        if (!hit) {
          const rowEl = clickableAncestors(el)[0] || el.parentElement;
          const rd = normalizePhone(rowEl?.innerText || "");
          if (rd) hit = (!!targetDigits && rd.includes(targetDigits)) || (!!phoneTail && rd.includes(phoneTail));
        }
      } else {
        hit = termHit(wanted);
      }
      if (!hit) for (const at of altList) { if (termHit(at)) { hit = true; break; } }
      if (hit) matches.push(el);
    }
    if (matches.length) {
      const innermost = matches.filter((el) => !matches.some((o) => o !== el && el.contains(o)));
      innermost.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      return innermost;
    }
    /* اگر هیچ ردیفِ هویت‌دار نبود: شکست صادقانه — ردیفِ بدون هویت کلیک نمی‌شود */
    return [];
  }

  /* والدینِ قابل‌کلیکِ کاندید — هندلر کلیک UIها معمولاً روی آیتم لیست (li/role=button) است
     نه روی داخلی‌ترین عنصر متنی؛ تا ۳ سطح بالاتر می‌رویم */
  function clickableAncestors(el) {
    const out = [];
    let cur = el?.parentElement;
    for (let i = 0; cur && cur !== document.body && i < 3; i++) {
      const role = cur.getAttribute?.("role");
      const cls = typeof cur.className === "string" ? cur.className : "";
      if (
        role === "button" || role === "option" || role === "listitem" || role === "menuitem" ||
        cur.tagName === "LI" || cur.tagName === "A" ||
        /item|row|chat|result|user|contact|click|entry/i.test(cls)
      ) out.push(cur);
      cur = cur.parentElement;
    }
    return out;
  }

  /* آیا نوار بالای گفتگوی باز (هدر سمت چپ در RTL) شمارهٔ هدف را نشان می‌دهد؟
     — اثبات مستقیم هویت: اگر ساب‌تایتل هدر خودِ شماره باشد، گفتگوی «همین شماره»
     باز است؛ مستقل از اینکه عنوان، نامِ واقعی حساب چه باشد. */
  function topStripHasPhone(digits, searchEl) {
    const d = normalizePhone(digits || "");
    if (!d || d.length < 8) return false;
    const tail = d.length >= 9 ? d.slice(-9) : d;
    try {
      for (const el of document.querySelectorAll("body *")) {
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
        if (el.children.length > 6) continue;
        if (!isVisEl(el)) continue;
        if (el.closest("#rw-agent-overlay")) continue;
        if (el.isContentEditable) continue;
        if (searchEl && (el === searchEl || searchEl.contains(el) || el.contains(searchEl))) continue;
        if (el.closest("[class*='composer'], [class*='message'], nav")) continue;
        const r = el.getBoundingClientRect();
        /* هدر گفتگوی باز — همان فیلتر chatTitle آداپتر روبیکا (حذف ستون لیست چت‌ها) */
        if (r.x < window.innerWidth * 0.32 || r.y > 170 || r.height > 90 || r.height < 6) continue;
        const td = normalizePhone(el.innerText || "");
        if (td && td.includes(tail)) return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  /* ═══════ Contact Resolution — استراتژی هدف (§۸/§۲۰/§۲۲) ═══════
     عامل هرگز از ابتدا Name Search انجام نمی‌دهد؛ به‌ترتیب اولویت:
     ① EXTERNAL_ID (اگر آداپتر باز کردن مستقیم با GUID را پشتیبانی کند)
     ② CHAT_REF — مرجع پایدار گفتگو یادگرفته‌شده از ارسال موفق قبل
     ③ PHONE ④ USERNAME ⑤ Name — فقط فال‌بک
     روش اجرا: فقط مسیرهای مجاز خود پلتفرم (جستجوی رسمی / hash routing) — §۲۲ */
  function normalizePhone(p) {
    if (!p) return "";
    const fa = String(p)
      .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
    let n = fa.replace(/[^0-9+]/g, "");
    n = n.replace(/^\+98/, "0").replace(/^98(?=\d{10}$)/, "0");
    return n;
  }

  function resolutionSupportOf(adapter) {
    return adapter.resolutionSupport || window.__RW_DEFAULT_RESOLUTION_SUPPORT__ || { chatRef: false, phone: true, username: false, name: true };
  }

  function buildTargetPlan(adapter, payload, fallbackName) {
    const support = resolutionSupportOf(adapter);
    const plan = [];
    if (payload.externalContactId && typeof adapter.openByExternalId === "function")
      plan.push({ method: "EXTERNAL_ID", ref: payload.externalContactId, direct: true });
    if (payload.chatRef && support.chatRef && typeof adapter.openByRef === "function")
      plan.push({ method: "CHAT_REF", ref: payload.chatRef, direct: true });
    const phone = normalizePhone(payload.phone || "");
    const shownName = (payload.displayName || fallbackName || "").trim();
    if (phone && support.phone) {
      /* فقط «جستجو با شماره» — سرچ مجدد با نام/نام‌کاربری ممنوع (درخواست کاربر).
         شماره، کلید پایدار مخاطب است؛ اگر طرفِ مقابل اپ را داشته باشد، جستجوی سراسریِ
         همان شماره حسابش را پیدا می‌کند — ذخیره‌بودن در مخاطبین لازم نیست.
         (v1.2.6) پلتفرم‌ها شماره را با فرمت‌های مختلف ایندکس می‌کنند (۰۹… / ۹… / +98…)
         — همهٔ فرمت‌های «همان شماره» به‌ترتیب امتحان می‌شوند؛ همچنان فقط جستجوی شماره‌ای */
      const variants = [];
      const pushV = (t) => { const v = String(t || "").trim(); if (v && !variants.includes(v)) variants.push(v); };
      pushV(phone);
      if (phone.startsWith("0")) { pushV(phone.slice(1)); pushV("+98" + phone.slice(1)); }
      else if (phone.startsWith("+98")) { pushV("0" + phone.slice(3)); pushV(phone.slice(3)); }
      else { pushV("0" + phone); pushV("+98" + phone); }
      plan.push({ method: "PHONE", term: variants[0], variants, alt: shownName || undefined });
    } else {
      const uname = (payload.username || "").trim().replace(/^@/, "");
      if (uname && support.username) plan.push({ method: "USERNAME", term: uname });
      if (shownName && support.name) plan.push({ method: "NAME_FALLBACK", term: shownName });
    }
    return plan;
  }

  /* ═══════ Target Verification (§۹) — قبل از ارسال، هویت مقصد تأیید می‌شود
     سیگنال‌های مجاز: نام نمایشی، شماره، نام کاربری، شواهد نتیجه جستجو.
     اگر هیچ سیگنالی مطابقت نداشت → قابل اطمینان نیست → پیام ارسال نمی‌شود */
  function verifyTarget(adapter, payload, evidence) {
    const signals = [];
    const displayName = normFa(payload.displayName || "");
    if (displayName && (chatMatchesTarget(adapter, payload.displayName) || topStripHasTarget(payload.displayName)))
      signals.push("name");
    const phone = normalizePhone(payload.phone || "");
    const phoneTail = phone.length >= 9 ? phone.slice(-9) : phone;
    if (phoneTail.length >= 8) {
      const hay = [adapter.chatTitle() || "", ...(evidence || [])].map((t) => normalizePhone(t || "")).join(" ");
      if (phoneTail && hay.includes(phoneTail)) signals.push("phone");
    }
    const uname = (payload.username || "").trim().replace(/^@/, "").toLowerCase();
    if (uname) {
      const hay = [adapter.chatTitle() || "", ...(evidence || [])].join(" ").toLowerCase();
      if (hay.includes(uname)) signals.push("username");
    }
    /* شواهد کلیک جستجو — متنِ ردیفی که کلیک شد باید نام هدف را داشته باشد */
    if (!signals.length && displayName && Array.isArray(evidence)) {
      const wantedWords = displayName.split(" ").filter((w) => w.length >= 3);
      for (const ct of evidence) {
        const cn = normFa(ct || "");
        if (cn && (cn.includes(displayName) || (wantedWords.length >= 2 && wantedWords.every((w) => cn.includes(w))))) {
          signals.push("evidence");
          break;
        }
      }
    }
    return { ok: signals.length > 0, signals };
  }

  /* باز کردن گفتگو بر اساس زنجیره اولویت شناسه‌ها — نتیجه شامل روشِ استفاده‌شده است
     تا در Debug Log و Analytics پنل ثبت شود (§۱۸/§۲۳) */
  async function openChatSmart(adapter, payload, fallbackName) {
    const plan = buildTargetPlan(adapter, payload, fallbackName);
    const triesLog = [];
    /* Verification payload — اگر پنل displayName نفرستاده بود (مسیرهای قدیمی)،
       همان هدف وظیفه معیار تطبیق می‌شود؛ هرگز بدون تأیید پیام نمی‌رویم (§۹) */
    const vPayload = { ...payload, displayName: (payload.displayName || fallbackName || "").trim() };
    if (!plan.length) {
      return {
        ok: false,
        errorKind: "target_unresolved",
        error: "Platform Identity Not Available — نه شناسه پلتفرم، نه شماره، نه نام کاربری و نه نامی برای رسیدن به این مخاطب ثبت نشده است. در پروفایل مخاطب، شناسه پلتفرم را ثبت کنید.",
        resolutionPlan: [],
        debug: domSnapshotDebug(adapter),
      };
    }
    for (const step of plan) {
      let oc = null;
      if (step.direct) {
        const started = step.method === "CHAT_REF" ? adapter.openByRef(step.ref) : adapter.openByExternalId(step.ref);
        if (started) {
          await sleep(2400);
          const v = verifyTarget(adapter, vPayload, []);
          if (v.ok) return { ok: true, method: step.method, evidence: [`direct-open:${step.ref}`], resolutionPlan: plan, verify: v };
          triesLog.push(`${step.method}: باز شد ولی هویت تأیید نشد`);
          continue;
        }
        triesLog.push(`${step.method}: مسیر مستقیم اجرا نشد`);
        continue;
      }
      /* (v1.2.6) PHONE با همهٔ فرمت‌های «همان شماره» تلاش می‌شود — ۰۹…، ۹…، +98…؛
         همچنان فقط جستجوی شماره‌ای، بدون سرچ با نام */
      const terms = Array.isArray(step.variants) && step.variants.length ? step.variants : [step.term];
      for (const term of terms) {
        oc = await openChat(adapter, term, step.alt ? [step.alt] : []);
        if (oc.ok) break;
        triesLog.push(`${step.method}[${term}]: ${oc.errorKind || "خطا"} — ${(oc.error || "").slice(0, 300)}`);
        oc = null;
      }
      if (oc && oc.ok) {
        let v = verifyTarget(adapter, vPayload, oc.evidence || []);
        /* §PHONE — اثبات کلید-جستجو: وقتی گفتگو با جستجوی «شمارهٔ دقیق» باز شده
           (کلید = شناسه پایدار مخاطب، نه نام نمایشیِ قابل‌تغییر)، هویت مقصد اثبات
           شده است؛ تطبیق نام اینجا معیار نیست چون نام واقعی حساب پلتفرم با نام
           مستعار پنل می‌تواند فرق داشته باشد (باگ «از روی شماره پیدا نمی‌کند») */
        if (!v.ok && step.method === "PHONE" && (oc.openedVia === "phone-key" || oc.openedVia === "phone-header"))
          v = { ok: true, signals: [`phone-key-search:${oc.openedVia}`] };
        if (v.ok) {
          /* resolvedTitle برای یادگیری پنل: نگاشت شماره ↔ نام واقعی حساب (به‌سوی Contact Platform Identity) */
          const ev = [...(oc.evidence || []), `resolvedTitle:${(adapter.chatTitle() || "").slice(0, 60)}`];
          return { ok: true, method: step.method, evidence: ev, resolutionPlan: plan, verify: v, openedVia: oc.openedVia || "" };
        }
        triesLog.push(`${step.method}: گفتگو باز شد ولی تأیید هویت نشد [${v.signals.join(",") || "بدون سیگنال"}]`);
        continue;
      }
      if (oc) triesLog.push(`${step.method}: ${oc.errorKind || "خطا"} — ${(oc.error || "").slice(0, 800)}`);
    }
    return {
      ok: false,
      errorKind: "chat_not_found",
      error: `هیچ‌یک از روش‌های Resolution (${plan.map((p) => p.method).join(" → ")}) نتوانست گفتگوی مقصد را باز کند — [${triesLog.join(" | ")}]`,
      resolutionPlan: plan,
      debug: domSnapshotDebug(adapter),
    };
  }

  /* باز کردن گفتگو با جستجو — استراتژی چندلایه:
     ① تایپ در جستجو → ② کلیک سینتتیک روی نتایج + والدین قابل‌کلیک
     → ③ کلیک «مورد اعتماد مرورگر» (chrome.debugger) → ④ کیبورد (ArrowDown+Enter)
     در هر مرحله باز شدن گفتگو بررسی می‌شود؛ در شکست، دیاگنوستیک دقیق برگردانده می‌شود */
  async function openChat(adapter, target, altTerms = []) {
    const dbg = { search: false, typed: "", results: 0, clicks: 0, keys: false, trusted: false };
    /* وضعیت اولیه — برای گارد «گفتگوی اشتباه»: اگر گفتگوی دیگری از قبل باز باشد،
       وجود کادر پیام به‌تنهایی معیار «باز شد» نیست (پیامِ هدف به گفتگوی اشتباه می‌رفت) */
    const startTitle = normFa(adapter.chatTitle());
    const composerWasOpen = !!findComposer(adapter, null);
    /* پل هویت کلیک→عنوان: اگر متنِ ردیفِ کلیک‌شده با عنوانِ فعلی match باشد،
       گفتگوی باز همان نتیجهٔ جستجوست (نام واقعی حساب می‌تواند هرچه باشد) */
    const clickedTitleMatch = () => {
      const t = normFa(adapter.chatTitle());
      if (!t) return false;
      for (const ct of clickedTexts) {
        const cn = normFa(ct);
        if (!cn) continue;
        if (t.includes(cn) || cn.includes(t)) return true;
        const tw = cn.split(" ").filter((w) => w.length >= 3);
        if (tw.length >= 2 && tw.every((w) => t.includes(w))) return true;
      }
      return false;
    };
    const nowTitleChanged = () => {
      const t = normFa(adapter.chatTitle());
      return !!(t && t !== startTitle);
    };
    /* تشخیص «گفتگو باز شد» — سیگنال‌های مستقل از کلاس‌های UI
       + اثبات کلید-جستجو برای PHONE (§PHONE): ما شمارهٔ دقیق را در جستجو تایپ کردیم،
       نتایجِ دید‌شده با ارقام همان شماره match بودند و بعد از کلیک، گفتگویی باز است */
    const opened = () => {
      if (chatMatchesTarget(adapter, target)) return true;
      const nowTitle = normFa(adapter.chatTitle());
      const titleChanged = !!(nowTitle && nowTitle !== startTitle);
      const comp = findComposer(adapter, null);
      const compVisible = !!(comp && isVisEl(comp));
      if (compVisible && (titleChanged || !composerWasOpen)) return true;
      if (compVisible && dbg.results > 0 && resultsGone() && (topStripHasTarget(target) || altTerms.some((a) => topStripHasTarget(a)))) return true;
      if (phoneMode && dbg.results > 0 && compVisible) {
        if (titleChanged) return true; /* ناوبری به گفتگوی جدید با کلید شماره */
        if (resultsGone() && (clickedTitleMatch() || topStripHasPhone(phoneKey, search))) return true;
      }
      return false;
    };

    if (!target) return { ok: !!adapter.chatTitle(), errorKind: adapter.chatTitle() ? undefined : "chat_not_found" };
    /* گفتگوی هدف از قبل باز است؟ — هم «هدفِ فعلی» (شماره در PHONE step) و هم
       «نام نمایشی» (altTerms) با عنوان فعلی چک می‌شود؛ وگرنه وقتی گفتگوی درست
       از قبل باز است، افزونه سرچِ بی‌دلیل می‌کند و روی ردیف‌های ناشناخته کلیک
       (باگ #9397: عنوان=آقای تیره چرخ2 از قبل باز، target=0912... → سرچ اضافی) */
    if (chatMatchesTarget(adapter, target) || altTerms.some((a) => a && chatMatchesTarget(adapter, a)))
      return { ok: true, evidence: ["already-open"] };
    /* اثبات شماره‌محورِ گفتگوی ازقبل باز (§PHONE) */
    const phoneKey = normalizePhone(target);
    const phoneMode = phoneKey.length >= 10;

    const fail = () => {
      const uniComp = findComposer(adapter, null);
      const parts = [
        `کادر جستجو: ${dbg.search ? "پیدا شد" : "پیدا نشد"}`,
        `تایپ: ${dbg.typed ? `«${dbg.typed}»` : "انجام نشد"}`,
        `نتایج دیده‌شده: ${dbg.results}`,
        `کلیک: ${dbg.clicks}`,
        `کلیک مرورگر: ${dbg.trusted ? "انجام شد" : "نه"}`,
        `کیبورد: ${dbg.keys ? "انجام شد" : "نه"}`,
        `کادر پیام (آداپتر): ${composerVisible(adapter) ? "بله" : "خیر"}`,
        `کادر پیام (عمومی): ${uniComp ? "بله" : "خیر"}`,
        `عنوان گفتگو: «${(startTitle || "").slice(0, 24) || "خالی"}» ← «${(adapter.chatTitle() || "").slice(0, 40) || "خالی"}»` + (nowTitleChanged() ? " (تغییر کرد)" : " (بدون تغییر)"),
        `نمونه متون نتایج: ${sampleSmallTexts(search, 4).map((s) => `«${s.slice(0, 28)}»`).join(" · ") || "—"}`,
      ];
      return { ok: false, errorKind: "chat_not_found", error: `گفتگوی «${target}» باز نشد — [اشکال‌یابی: ${parts.join(" | ")}]`, debug: domSnapshotDebug(adapter) };
    };

    const search = adapter.searchBox?.();
    dbg.search = !!(search && isVisEl(search));
    /* اثبات شماره‌محورِ گفتگوی ازقبل باز (§PHONE): اگر هدر گفتگوی باز خودِ شماره را نشان
       می‌دهد، گفتگوی «همین شماره» باز است — حتی اگر عنوان، نام واقعی حساب باشد */
    if (phoneMode && topStripHasPhone(phoneKey, search))
      return { ok: true, evidence: ["phone-header:" + phoneKey], openedVia: "phone-header" };
    const clickedTexts = [];
    /* اسنپ‌شات ستونِ جستجو «قبل از تایپ» — مبنای تشخیص «ردیفِ تازه = نتیجهٔ جستجو» */
    const preTexts = snapshotColumnTexts(search);
    /* سخت‌گیری phone-key (v1.2.5): openedVia=phone-key فقط وقتی معتبر است که
       متنِ یکی از ردیف‌های «کلیک‌شده» واقعاً ارقامِ همان شماره را داشته باشد؛
       وگرنه row-click — و تأیید هویت باید از مسیر عادی (نام/شواهد) بگذرد */
    const phoneTailKey = phoneKey.length >= 9 ? phoneKey.slice(-9) : phoneKey;
    const digitsSeenInClicks = () => clickedTexts.some((ct) => {
      const td = normalizePhone(ct || "");
      return !!td && ((phoneKey && td.includes(phoneKey)) || (phoneTailKey && td.includes(phoneTailKey)));
    });
    const clickOpenedVia = () => (phoneMode ? (digitsSeenInClicks() ? "phone-key" : "row-click") : "result-click");

    if (search) {
      /* ریست state گیرکردهٔ جستجوی قبلی (باگ «نتایج ۰ در اجرای پشت‌سرهم»):
         Escape کشوی نتایج کهنه را می‌بندد تا تایپ مجدد، کوئری تازه بسازد */
      try { search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true })); } catch {}
      await sleep(400);
      try { search.focus(); } catch {}
      /* پاک‌سازی باقی‌مانده جستجوی قبلی — وگرنه متن‌ها به هم می‌چسبند */
      if (search.isContentEditable) {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
        document.execCommand("insertText", false, target);
      } else {
        const setter = Object.getOwnPropertyDescriptor(search.constructor.prototype, "value")?.set;
        if (setter) setter.call(search, target);
        else search.value = target;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
      dbg.typed = ((search.value ?? search.innerText ?? "") + "").trim().slice(0, 30);
      await sleep(1600);
    }

    /* کلیدهای کیبورد کامل — رویدادهای keydown/keypress/keyup با کد صحیح */
    const pressKey = (el, info) => {
      for (const type of ["keydown", "keypress", "keyup"]) {
        try { el.dispatchEvent(new KeyboardEvent(type, { ...info, bubbles: true, cancelable: true })); } catch {}
      }
    };

    /* کیبورد: ArrowDown برای انتخاب اولین نتیجه + Enter برای باز کردن */
    const keyboardSelectFirst = async () => {
      const focusEl = (search && isVisEl(search)) ? search : document.activeElement;
      if (!focusEl) return;
      pressKey(focusEl, { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40 });
      await sleep(400);
      pressKey(focusEl, { key: "Enter", code: "Enter", keyCode: 13, which: 13 });
      dbg.keys = true;
      await sleep(1700);
    };

    /* کلیک مورد اعتماد مرورگر از طریق chrome.debugger — رویدادهای واقعی
       برای UIهایی که رویدادهای سینتتیک (isTrusted=false) را رد می‌کنند */
    const trustedClick = (x, y) =>
      new Promise((resolve) => {
        try {
          const timer = setTimeout(() => resolve(null), 4000);
          chrome.runtime.sendMessage({ type: "RW_TRUSTED_CLICK", x, y }, (resp) => {
            clearTimeout(timer);
            resolve(chrome.runtime.lastError ? null : resp || null);
          });
        } catch { resolve(null); }
      });

    /* تلاش برای باز کردن گفتگو با کلیک روی یک کاندید — سه روش پشت سر هم */
    const tryClickOne = async (cand) => {
      const r = cand.getBoundingClientRect();
      clickedTexts.push((cand.innerText || "").trim().slice(0, 60));
      /* پل هویت ردیف‌محور: کاندیدِ داخلی‌ترین عنصر است و ممکن است فقط شماره را داشته باشد
         (بدون نام) — متنِ ردیف کامل (والد قابل‌کلیک: نام + شماره) هم ثبت می‌شود */
      const rowEl = clickableAncestors(cand)[0] || cand.parentElement || cand;
      const rowTxt = (rowEl.innerText || "").trim().slice(0, 90);
      if (rowTxt && rowTxt !== (cand.innerText || "").trim()) clickedTexts.push(rowTxt);
      /* ① کلیک سینتتیک روی خود عنصر */
      deepClick(cand);
      dbg.clicks++;
      await sleep(1400);
      if (opened()) return true;
      /* ② کلیک روی والدین قابل‌کلیک — هندلر معمولاً روی آیتم لیست است */
      for (const anc of clickableAncestors(cand).slice(0, 2)) {
        deepClick(anc);
        dbg.clicks++;
        await sleep(1400);
        if (opened()) return true;
      }
      /* ③ کلیک مورد اعتماد مرورگر روی مختصات عنصر */
      const resp = await trustedClick(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2));
      if (resp?.ok) {
        dbg.trusted = true;
        dbg.clicks++;
        await sleep(1700);
        if (opened()) return true;
      }
      return false;
    };

    /* انتظار برای ظاهر شدن نتایج جستجو (جستجوی سراسری روبیکا کند است) */
    let candidates = [];
    await waitFor(() => {
      candidates = collectResultCandidates(target, search, altTerms, preTexts);
      return candidates.length ? candidates[0] : null;
    }, 10000, 400);
    /* retry تایپ: اگر با وجود تایپِ ثبت‌شده هیچ نتیجه‌ای نیامد (state گیرکرده/throttle
       جستجوی سراسری)، یک بار Escape → پاک‌سازی → تایپ مجدد با انتظار طولانی‌تر */
    if (!candidates.length && search && dbg.typed) {
      try { search.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true })); } catch {}
      await sleep(700);
      try { search.focus(); } catch {}
      if (search.isContentEditable) {
        document.execCommand("selectAll", false, null);
        document.execCommand("delete", false, null);
        document.execCommand("insertText", false, target);
      } else {
        const setter2 = Object.getOwnPropertyDescriptor(search.constructor.prototype, "value")?.set;
        if (setter2) setter2.call(search, target);
        else search.value = target;
        search.dispatchEvent(new Event("input", { bubbles: true }));
      }
      await sleep(2600);
      await waitFor(() => {
        candidates = collectResultCandidates(target, search, altTerms, preTexts);
        return candidates.length ? candidates[0] : null;
      }, 9000, 450);
    }
    dbg.results = candidates.length;
    /* مرجعِ خودِ عناصر نتیجه نگه داشته می‌شود — بعد از باز شدن گفتگو، نام مخاطب
       در عنوانِ گفتگو هم هست، پس «بسته شدن کشو» را باید از جدا شدن خودِ عناصر
       فهمید نه از نبودِ متن هدف در صفحه */
    let firstResultEls = candidates.slice(0, 4);
    const resultsGone = () => !firstResultEls.some((el) => el && el.isConnected && isVisEl(el));

    if (candidates.length) {
      for (const cand of candidates.slice(0, 4)) {
        if (!cand || !isVisEl(cand)) continue;
        if (await tryClickOne(cand)) return { ok: true, evidence: clickedTexts, openedVia: clickOpenedVia() };
      }
    }

    /* فال‌بک کیبورد: ArrowDown + Enter و سپس اسکن دوباره نتایج */
    await keyboardSelectFirst();
    await waitFor(() => {
      candidates = collectResultCandidates(target, search, altTerms, preTexts);
      return candidates.length ? candidates[0] : null;
    }, 3500, 350);
    dbg.results = Math.max(dbg.results, candidates.length);
    firstResultEls = candidates.slice(0, 4); /* رفرش مراجع برای دور دوم کلیک */
    if (candidates.length) {
      for (const cand of candidates.slice(0, 4)) {
        if (!cand || !isVisEl(cand)) continue;
        if (await tryClickOne(cand)) return { ok: true, evidence: clickedTexts, openedVia: clickOpenedVia() };
      }
    }
    if (opened()) return { ok: true, evidence: clickedTexts, openedVia: clickOpenedVia() };

    /* فال‌بک هویتی: عنصری که کلیک شد نام هدف را داشت (نام کامل یا همهٔ کلمات معنادارش)
       و الان کادر پیام باز است → گفتگوی درست باز شده اما selector عنوان با آن نمی‌خواند.
       گارد گفتگوی اشتباه: اگر گفتگویی از قبل باز بود و عنوان تغییر نکرد، تأیید ممنوع —
       چون ممکن است کلیک بی‌اثر بوده و پیام به گفتگوی قبلی برود */
    const wantedFull = normFa(target);
    const nowTitle = normFa(adapter.chatTitle());
    const titleChanged = !!(nowTitle && nowTitle !== startTitle);
    const uniComp = findComposer(adapter, null);
    if (uniComp && isVisEl(uniComp) && (titleChanged || !composerWasOpen)) {
      /* تطبیق شواهد کلیک: هدف اصلی + شناسه‌های جایگزین (نام نمایشی در PHONE step) */
      const terms = [wantedFull, ...altTerms.map((x) => normFa(x))].filter(Boolean);
      for (const ct of clickedTexts) {
        const cn = normFa(ct);
        if (!cn) continue;
        for (const term of terms) {
          const tw = term.split(" ").filter((w) => w.length >= 3);
          if (cn.includes(term) || (tw.length >= 2 && tw.every((w) => cn.includes(w)))) {
            return { ok: true, evidence: clickedTexts };
          }
        }
      }
    }

    return fail();
  }

  /* payload از DB به‌صورت رشته JSON می‌آید (پنل: payload String) —
   اگر پارس نشود task.payload?.text همیشه undefined است و پیام «خالی» می‌شود */
  function normalizePayload(p) {
    if (p && typeof p === "object") return p;
    if (typeof p === "string") {
      try { return JSON.parse(p) || {}; } catch { return {}; }
    }
    return {};
  }

  /* ⭐ گارد نوع گفتگو (v1.2.5 — باگ «اشتباهی میره تو کانالا پیام میفرسته»):
     قبل از ارسال به مخاطبِ شماره‌محور، باز بودن «گفتگوی خصوصی» تأیید می‌شود —
     کانال/گروه هرگز مقصد مجازِ تماسِ مخاطب نیست. نشانه‌ها: تعداد عضو/دنبال‌کننده
     در نوار هدر گفتگو. محافظه‌کار: فقط ناحیهٔ هدر (بالا/راست صفحه) چک می‌شود،
     نه متن پیام‌ها — تا پیام‌های عادی باعث بلوکِ کاذب نشوند */
  function openedChatLooksGroupish() {
    try {
      for (const el of document.querySelectorAll("body *")) {
        const tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "INPUT" || tag === "TEXTAREA") continue;
        if (el.children.length > 8) continue;
        if (!isVisEl(el)) continue;
        if (el.closest("#rw-agent-overlay")) continue;
        if (el.isContentEditable) continue;
        const r = el.getBoundingClientRect();
        if (r.y > 170 || r.height > 90 || r.height < 6) continue;
        if (r.x < window.innerWidth * 0.32) continue; /* فقط هدر گفتگو (RTL) — نه لیست چت‌ها */
        const t = normFa(el.innerText || "");
        if (!t || t.length > 80) continue;
        if (/\d[\d,،._]*\s*(عضو|نفر|دنبال‌کننده|member|subscriber)/i.test(t)) return true;
      }
    } catch { /* ignore */ }
    return false;
  }

  /* ═══════ هسته اجرای Task ═══════ */
  async function runTask(task) {
    const detected = detectAdapter();
    if (!detected) {
      return { taskId: task.id, refNo: task.refNo, status: "failed", errorKind: "unsupported_action", error: "پلتفرم این صفحه پشتیبانی نمی‌شود" };
    }
    const adapter = detected.adapter;
    const ctx = getContext();

    /* Safety Layer */
    const safety = safetyCheck(task, ctx);
    if (!safety.pass) {
      const expired = safety.reasons.some((r) => r.includes("منقضی"));
      return {
        taskId: task.id, refNo: task.refNo, status: "failed",
        errorKind: expired ? "session_expired" : "human_action",
        error: safety.reasons.join(" — "),
      };
    }

    overlayShow();
    const steps = defaultSteps();
    overlaySteps(steps);

    const support = adapter.support || {};
    const payload = normalizePayload(task.payload);
    let result = { taskId: task.id, refNo: task.refNo, status: "success" };

    try {
      switch (task.action) {
        case "SEND_TEXT": {
          if (!support.sendText) { result = { ...result, status: "failed", errorKind: "unsupported_action", error: "ارسال متن در این سرویس پشتیبانی نمی‌شود" }; break; }
          setStep(steps, "find", "active");
          /* ── Contact Resolution (§۱۷): باز کردن هدف با زنجیره شناسه‌ها — Name فقط فال‌بک ── */
          const oc = await openChatSmart(adapter, payload, task.target);
          result.resolution = oc.method || "NONE";
          result.resolutionPlan = (oc.resolutionPlan || []).map((p) => p.method);
          result.detectedRef = typeof adapter.chatRef === "function" ? adapter.chatRef() : "";
          if (!oc.ok) { setStep(steps, "find", "failed"); result = { ...result, status: "failed", errorKind: oc.errorKind, error: oc.error, result: oc.debug || "" }; break; }
          /* ⚠️ گارد هویت مقصد (§۹) — بعد از باز شدن، گفتگو با سیگنال‌های مجاز تأیید می‌شود */
          const dest = verifyTarget(adapter, payload, oc.evidence);
          const phoneKeyOk = !!(oc.openedVia === "phone-key" || oc.openedVia === "phone-header");
          const destOk =
            dest.ok ||
            phoneKeyOk ||
            chatMatchesTarget(adapter, task.target) ||
            topStripHasTarget(task.target) ||
            (Array.isArray(oc.evidence) && oc.evidence.some((ct) => {
              const cn = normFa(ct);
              const wn = normFa(task.target);
              const ww = wn.split(" ").filter((w) => w.length >= 3);
              return cn && (cn.includes(wn) || (ww.length >= 2 && ww.every((w) => cn.includes(w))));
            }));
          if (!destOk) {
            setStep(steps, "find", "failed");
            result = { ...result, status: "failed", errorKind: "target_unverified", error: `گفتگوی بازشده با مخاطب «${payload.displayName || task.target}» تأیید نشد — برای جلوگیری از ارسال اشتباه، پیام ارسال نشد. عنوان فعلی: «${(adapter.chatTitle() || "").slice(0, 40) || "نامشخص"}»`, result: domSnapshotDebug(adapter) };
            break;
          }
          result.verifiedBy = (dest.signals && dest.signals.length ? dest.signals.join("+") : (phoneKeyOk ? "phone-key-search" : "name"));
          /* ⭐ گارد کانال/گروه — آخرین سد امنیتی: مقصدِ تماسِ مخاطب باید گفتگوی خصوصی باشد؛
             وگرنه پیام «هیچ‌وقت» تایپ نمی‌شود (باگ ارسال اشتباه به کانال) */
          if (payload.phone && openedChatLooksGroupish()) {
            setStep(steps, "find", "failed");
            result = { ...result, status: "failed", errorKind: "wrong_chat_type", error: `مقصدِ بازشده برای مخاطب «${payload.displayName || task.target}» گفتگوی خصوصی نیست (کانال/گروه تشخیص داده شد) — برای جلوگیری از ارسال اشتباه، پیام ارسال نشد. عنوان فعلی: «${(adapter.chatTitle() || "").slice(0, 40) || "نامشخص"}»`, result: domSnapshotDebug(adapter) };
            break;
          }
          setStep(steps, "find", "done");
          setStep(steps, "input", "active");
          /* کادر پیام: اول selector آداپتر، بعد روش «عمومی» (پایین‌ترین فیلد متنی صفحه) —
             برای روبیکا که کلاس‌هایش با selectorهای آداپتر نمی‌خوانند */
          const viaAdapter = adapter.input();
          const composer = (viaAdapter && isVisEl(viaAdapter)) ? viaAdapter : findComposer(adapter, null);
          if (!composer) { setStep(steps, "input", "failed"); result = { ...result, status: "failed", errorKind: "input_not_found", error: "کادر پیام پیدا نشد — حتی با روش عمومی", result: domSnapshotDebug(adapter) }; break; }
          setStep(steps, "input", "done");
          setStep(steps, "prepare", "done");
          setStep(steps, "send", "active");
          const text = payload?.text || "";
          if (!text.trim()) { setStep(steps, "send", "failed"); result = { ...result, status: "failed", errorKind: "send_button_missing", error: "متن پیام خالی است" }; break; }
          const before = captureBefore(adapter);
          const sent = await typeAndSend(adapter, text, composer, before);
          if (!sent.ok) { setStep(steps, "send", "failed"); result = { ...result, status: "failed", errorKind: sent.errorKind, error: sent.error }; break; }
          setStep(steps, "send", "done");
          setStep(steps, "verify", "active");
          /* تأیید واقعی: حباب خروجیِ جدید با همین متن باید در گفتگو ظاهر شود */
          const verified = await waitFor(() => verifyNewOutgoing(adapter, text, before), 12000, 450);
          const inputAfter = (adapter.input() && isVisEl(adapter.input())) ? adapter.input() : composer;
          const inputCleared = !inputAfter || normText(inputAfter.innerText || inputAfter.value || "") === "";
          /* فال‌بک عمومیِ مستقل از کلاس‌های UI: کادر پیام خالی شده و متن پیام در بدنه گفتگو
             ظاهر شده است — برای سرویس‌هایی مثل روبیکا که حباب خروجی را با کلاس‌های متفاوت رندر می‌کنند */
          const bodyHasText = normText(document.body?.innerText || "").includes(normText(text));
          if (verified || (inputCleared && bodyHasText)) {
            setStep(steps, "verify", "done");
          } else if (inputCleared) {
            /* input خالی شده ولی نه حباب دیدیم و نه متن در گفتگو — ثبت Success ممنوع */
            setStep(steps, "verify", "failed");
            result = { ...result, status: "failed", errorKind: "send_not_verified", error: "پیام ارسال شد اما حباب آن در گفتگو دیده نشد — وضعیت نامشخص؛ لطفاً در صفحه بررسی کنید", result: domSnapshotDebug(adapter) };
          } else {
            setStep(steps, "verify", "failed");
            result = { ...result, status: "failed", errorKind: "send_not_verified", error: "ارسال تأیید نشد — پیام در گفتگو ظاهر نشد (ممکن است دکمه ارسال یا Enter کار نکرده باشد)", result: domSnapshotDebug(adapter) };
          }
          break;
        }
        case "SEND_IMAGE":
        case "SEND_FILE":
        case "SEND_IMAGE_WITH_CAPTION": {
          if (!support.sendImage && task.action !== "SEND_FILE") { result = { ...result, status: "failed", errorKind: "unsupported_action", error: "ارسال عکس پشتیبانی نمی‌شود" }; break; }
          setStep(steps, "find", "active");
          const oc = await openChatSmart(adapter, payload, task.target);
          result.resolution = oc.method || "NONE";
          result.resolutionPlan = (oc.resolutionPlan || []).map((p) => p.method);
          result.detectedRef = typeof adapter.chatRef === "function" ? adapter.chatRef() : "";
          if (!oc.ok) { setStep(steps, "find", "failed"); result = { ...result, status: "failed", errorKind: oc.errorKind, error: oc.error }; break; }
          const destImg = verifyTarget(adapter, payload, oc.evidence);
          const phoneKeyImg = !!(oc.openedVia === "phone-key" || oc.openedVia === "phone-header");
          if (!destImg.ok && !phoneKeyImg && !chatMatchesTarget(adapter, task.target) && !topStripHasTarget(task.target)) {
            setStep(steps, "find", "failed");
            result = { ...result, status: "failed", errorKind: "target_unverified", error: `گفتگوی بازشده با مخاطب «${payload.displayName || task.target}» تأیید نشد — پیام رسانه‌ای ارسال نشد` };
            break;
          }
          /* ⭐ گارد کانال/گروه برای رسانه‌ها هم */
          if (payload.phone && openedChatLooksGroupish()) {
            setStep(steps, "find", "failed");
            result = { ...result, status: "failed", errorKind: "wrong_chat_type", error: `مقصدِ بازشده برای مخاطب «${payload.displayName || task.target}» گفتگوی خصوصی نیست (کانال/گروه) — ارسال رسانه متوقف شد`, result: domSnapshotDebug(adapter) };
            break;
          }
          setStep(steps, "find", "done");
          setStep(steps, "input", "active");
          const name = payload?.image || payload?.file || "attachment.bin";
          setStep(steps, "input", "done");
          setStep(steps, "prepare", "active");
          const before2 = captureBefore(adapter);
          const up = await uploadFile(adapter, makePlaceholderBlob(name), name, payload?.caption);
          if (!up.ok) { setStep(steps, "prepare", "failed"); result = { ...result, status: "failed", errorKind: up.errorKind, error: up.error }; break; }
          setStep(steps, "prepare", "done");
          setStep(steps, "send", "done");
          setStep(steps, "verify", "active");
          /* تأیید واقعی: حباب خروجیِ جدید باید ظاهر شود (بدون چک متن — ضمیمه است) */
          const verified2 = await waitFor(() => verifyNewOutgoing(adapter, "", before2), 10000, 500);
          setStep(steps, "verify", verified2 ? "done" : "failed");
          if (!verified2) result = { ...result, status: "failed", errorKind: "send_not_verified", error: "ارسال فایل تأیید نشد — حباب پیام در گفتگو ظاهر نشد" };
          break;
        }
        case "CREATE_GROUP": {
          if (!support.createGroup) { result = { ...result, status: "failed", errorKind: "unsupported_action", error: "ساخت گروه در این سرویس از طریق UI پشتیبانی نمی‌شود" }; break; }
          setStep(steps, "find", "done");
          setStep(steps, "input", "done");
          setStep(steps, "prepare", "active");
          /* مسیر استاندارد: دکمه منو → New Group — با جستجوی aria */
          const menuBtn = document.querySelector("[aria-label*='menu' i], [aria-label*='منو']") || document.querySelector("header button:last-of-type");
          if (menuBtn) { menuBtn.click(); await sleep(700); }
          const newGroup = window.__RW_FINDER__.byAriaLabels(["new group", "group", "گروه جدید"]);
          if (!newGroup) { setStep(steps, "prepare", "failed"); result = { ...result, status: "failed", errorKind: "platform_ui_changed", error: "گزینه ساخت گروه در منو پیدا نشد" }; break; }
          newGroup.click();
          await sleep(1000);
          setStep(steps, "prepare", "done");
          setStep(steps, "send", "active");
          const groupName = task.payload?.groupName || "گروه جدید";
          const nameInput = await waitFor(() => document.querySelector("input[placeholder*='نام'], input[placeholder*='name' i], div[contenteditable='true']"), 4000);
          if (nameInput) {
            nameInput.focus();
            if (nameInput.isContentEditable) document.execCommand("insertText", false, groupName);
            else { nameInput.value = groupName; nameInput.dispatchEvent(new Event("input", { bubbles: true })); }
            await sleep(400);
          }
          const confirm = window.__RW_FINDER__.byAriaLabels(["create", "ok", "ایجاد", "تأیید"]);
          if (confirm) confirm.click();
          await sleep(1200);
          setStep(steps, "send", "done");
          setStep(steps, "verify", "active");
          const okGroup = adapter.chatTitle()?.includes(groupName.slice(0, 6));
          setStep(steps, "verify", okGroup ? "done" : "failed");
          if (!okGroup) result = { ...result, status: "failed", errorKind: "platform_ui_changed", error: "گروه ساخته شد اما تأیید نشد" };
          break;
        }
        case "OPEN_CHAT": {
          setStep(steps, "find", "active");
          const oc = await openChatSmart(adapter, payload, task.target);
          result.resolution = oc.method || "NONE";
          result.resolutionPlan = (oc.resolutionPlan || []).map((p) => p.method);
          result.detectedRef = typeof adapter.chatRef === "function" ? adapter.chatRef() : "";
          setStep(steps, "find", oc.ok ? "done" : "failed");
          setStep(steps, "input", "done");
          setStep(steps, "prepare", "done");
          setStep(steps, "send", "done");
          setStep(steps, "verify", oc.ok ? "done" : "failed");
          if (!oc.ok) result = { ...result, status: "failed", errorKind: oc.errorKind, error: oc.error };
          break;
        }
        case "READ_CHAT_CONTEXT":
        case "GET_CHAT_TYPE": {
          setStep(steps, "find", "done");
          setStep(steps, "input", "done");
          setStep(steps, "prepare", "done");
          setStep(steps, "send", "done");
          setStep(steps, "verify", "active");
          const ctxNow = getContext();
          setStep(steps, "verify", "done");
          result.chatType = ctxNow.chatType;
          result.result = `Platform: ${ctxNow.platformLabel} | Chat: ${ctxNow.chatName || "—"} | Chat Type: ${typeLabel(ctxNow.chatType)}`;
          break;
        }
        default: {
          result = { ...result, status: "failed", errorKind: "unsupported_action", error: "Action ناشناخته" };
        }
      }
    } catch (e) {
      result = { ...result, status: "failed", errorKind: "platform_ui_changed", error: "خطای اجرا در صفحه — Adapter نیاز به بررسی دارد" };
    }

    /* مانع امنیتی — Human Action Required (§۳۳) */
    if (result.status === "failed" && (result.errorKind === "human_action" || result.errorKind === "session_expired")) {
      const meta = result.errorKind === "session_expired"
        ? { friendly: "نشست اکانت منقضی شده است", advice: "در همین صفحه وارد شوید؛ سپس از پنل «ادامه وظیفه» را بزنید." }
        : { friendly: "مانع امنیتی ظاهر شده است", advice: "عامل هرگز موانع امنیتی را دور نمی‌زند — خودتان در صفحه اقدام کنید و بعد از پنل ادامه دهید." };
      overlayError(meta.friendly, meta.advice);
      reportContext();
      return result;
    }

    reportContext();
    overlayHide(result.status === "success" ? 1600 : 8000);
    return result;
  }

  function typeLabel(t) {
    return { private: "گفتگوی خصوصی", group: "گروه", channel: "کانال", bot: "بات", business: "حساب تجاری", unknown: "ناشناخته" }[t] ?? t;
  }

  /* ═══════ گوش‌دادن به دستورات Service Worker ═══════ */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "RW_PING") {
      sendResponse({ ok: true });
      return;
    }
    if (msg?.type === "RW_GET_CONTEXT") {
      sendResponse(getContext());
      return;
    }
    if (msg?.type === "RW_TASK") {
      if (working) {
        sendResponse({ taskId: msg.task.id, refNo: msg.task.refNo, status: "failed", errorKind: "human_action", error: "عامل هم‌اکنون مشغول وظیفه دیگری است" });
        return;
      }
      working = true;
      /* Watchdog — اگر runTask هیچ‌وقت settle نشود (باگ فریم‌ورک/تعلیق مرورگر)،
         پاسخ خطا برمی‌گردد وگرنه promise مربوط به sendMessage در Service Worker
         برای همیشه معلق می‌ماند و زنجیره وظایف قفل می‌شود */
      let answered = false;
      const finish = (res) => {
        if (answered) return;
        answered = true;
        try { sendResponse(res); } catch { /* کانال بسته شده */ }
      };
      const watchdog = setTimeout(() => finish({
        taskId: msg.task.id, refNo: msg.task.refNo, status: "failed",
        errorKind: "network", error: "مهلت اجرای وظیفه در صفحه تمام شد (watchdog)",
      }), 160000);
      runTask(msg.task)
        .then((res) => finish(res))
        .catch((e) => finish({ taskId: msg.task.id, refNo: msg.task.refNo, status: "failed", errorKind: "network", error: String(e) }))
        .finally(() => { clearTimeout(watchdog); working = false; });
      return true; /* async */
    }
  });

  /* گزارش اولیه و در تغییر مسیر (SPA navigation) */
  reportContext();
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      reportContext();
    }
  }, 1500);
})();
