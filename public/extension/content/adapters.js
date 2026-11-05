/* ═══════════════════════════════════════════════════════════
   RasaWeb Agent — Platform Adapters (§۲/§۲۱)
   هر Adapter وظیفه شناخت UI و اجرای Actionهای همان سرویس را دارد.
   افزودن پیام‌رسان جدید = افزودن Adapter جدید — بدون تغییر هسته.
   ═══════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ابزارهای مشترک پیدا کردن عنصر — چند گزینه جایگزین برای مقاومت در برابر تغییر UI */
  const Finder = {
    first(existing, selectors) {
      for (const sel of selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) return el;
        } catch {
          /* selector نامعتبر */
        }
      }
      return null;
    },
    byAriaLabels(labels) {
      for (const label of labels) {
        const el =
          document.querySelector(`[aria-label*="${label}" i]`) ||
          document.querySelector(`[title*="${label}" i]`) ||
          document.querySelector(`[data-icon="${label}"]`);
        if (el) return el;
      }
      return null;
    },
  };

  /* آیا عنصر واقعاً در صفحه دیده می‌شود؟ — برای تشخیص نشست از false-positive جلوگیری می‌کند */
  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
    return !!(el.offsetParent || el.getClientRects().length);
  }

  /* تشخیص عمومی نوع چت از روی نشانه‌های UI */
  function heuristicChatType(root = document) {
    const text = (root.body?.innerText || "").slice(0, 4000);
    /* نشانه‌های کانال */
    if (root.querySelector('[data-icon="channel"], [aria-label*="channel" i], [aria-label*="کانال"]')) return "channel";
    /* نشانه‌های گروه: لیست مشارکت‌کنندگان، تعداد اعضا */
    if (
      root.querySelector('[aria-label*="participant" i], [aria-label*="member" i], [aria-label*="عضو"], [data-icon="group"]') ||
      /\d+\s*(members|members|عضو|نفر)/i.test(text)
    ) {
      return "group";
    }
    /* نشانه بات */
    if (/bot|بات/i.test(root.querySelector("header")?.innerText || "")) return "bot";
    return "private";
  }

  /* آداپترها می‌توانند اعلام کنند کدام روش‌های Resolution را مستقیم پشتیبانی می‌کنند (§۲۱/§۲۲)
     chatRef: باز کردن مستقیم با مرجع پایدار گفتگو (مسیر رسمی خود پلتفرم)
     phone/username/name: جستجو در کادر جستجوی خود سرویس */
  const DEFAULT_RESOLUTION_SUPPORT = { chatRef: false, phone: true, username: false, name: true };

  /* ── تعریف Adapterها ──
     هر Adapter: match(hostname) + انتخابگرها + توابع سفارشی.
     Selectorها عمداً چندلایه‌اند؛ اگر همه شکست بخورند خطای
     platform_ui_changed گزارش می‌شود (§۲۹). */

  const Adapters = {
    /* ═══ WhatsApp Web ═══ */
    whatsapp: {
      label: "WhatsApp",
      hosts: ["web.whatsapp.com"],
      webUrl: "https://web.whatsapp.com",
      support: { sendText: true, sendImage: true, sendFile: true, caption: true, createGroup: true },
      /* واتساپ: باز کردن مستقیم با شماره از مسیر رسمی wa.me/send?phone= (§۲۱) */
      resolutionSupport: { chatRef: true, phone: true, username: false, name: true },
      chatRef() {
        const m = /[?&]phone=(\d{8,15})/.exec(location.href) || /"?(\d{8,15})@c\.us"?/.exec(location.hash || "");
        return m ? m[1] : "";
      },
      chatTitle() {
        const el = Finder.first(null, [
          "header [title]",
          "header span[dir='auto'][title]",
          "header div[role='button'] span[title]",
          "header",
        ]);
        return el?.getAttribute("title") || el?.innerText?.trim().split("\n")[0] || "";
      },
      openByRef(ref) {
        if (!/^\d{8,15}$/.test(ref)) return false;
        location.href = `https://web.whatsapp.com/send?phone=${ref}`;
        return true;
      },
      chatType: heuristicChatType,
      input() {
        return Finder.first(null, [
          "footer div[contenteditable='true'][data-tab]",
          "footer div[contenteditable='true']",
          "div[contenteditable='true'][data-tab='10']",
          "div[contenteditable='true'][role='textbox']",
        ]);
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "Send", "ارسال"]);
      },
      attachButton() {
        return Finder.byAriaLabels(["attach", "Plus", "clip", "پیوست"]);
      },
      fileInput() {
        return document.querySelector("input[type='file'][accept*='image'], input[type='file']");
      },
      lastOutgoing() {
        return document.querySelector("div.message-out, [class*='message-out'], div[data-id*='out']");
      },
      searchBox() {
        return Finder.byAriaLabels(["search", "جستجو"]) || document.querySelector("div[contenteditable='true'][data-tab='3']");
      },
      loginCheck() {
        /* فقط نشانه‌های «قابل مشاهده» صفحه ورود — canvas خالی به‌تنهایی نشانه خروج نیست */
        const qr = [...document.querySelectorAll("canvas[aria-label*='QR'], div[data-ref]")].find(isVisible);
        return !qr;
      },
    },

    /* ═══ Telegram Web ═══ */
    telegram: {
      label: "Telegram",
      hosts: ["web.telegram.org"],
      webUrl: "https://web.telegram.org",
      support: { sendText: true, sendImage: true, sendFile: true, caption: true, createGroup: true },
      /* تلگرام: باز کردن مستقیم با @username یا شناسه عددی چت از hash خود اپ (§۲۱)
         جستجوی شماره در وب تلگرام ممکن نیست — USERNAME اولویت می‌گیرد */
      resolutionSupport: { chatRef: true, phone: false, username: true, name: true },
      chatRef() {
        const h = location.hash || "";
        const u = /#\/?@([A-Za-z0-9_]{4,32})/.exec(h);
        if (u) return "@" + u[1];
        const n = /#(-\d{6,})/.exec(h);
        return n ? n[1] : "";
      },
      openByRef(ref) {
        if (!ref) return false;
        const h = ref.startsWith("@") || ref.startsWith("-") ? ref : "@" + ref;
        location.hash = h;
        return true;
      },
      chatTitle() {
        const el = Finder.first(null, [
          ".topbar .chat-title .peer-title",
          "div.topbar span.peer-title",
          ".chat-title",
          "div[class*='TopBar'] .peer-title",
          "div[class*='topbar'] .title",
        ]);
        return el?.innerText?.trim() || "";
      },
      chatType(root = document) {
        if (root.querySelector(".topbar .chat-subtitle")?.innerText?.match(/\d+\s*(subscribers|عضو|member)/i)) return "channel";
        if (root.querySelector(".topbar .chat-subtitle")?.innerText?.match(/\d+\s*(members|عضو)/i)) return "group";
        if (/bot/i.test(document.querySelector(".topbar .peer-title")?.innerText || "")) return "bot";
        return "private";
      },
      input() {
        return Finder.first(null, [
          "div.input-message-input[data-placeholder]",
          "div.input-message-input[contenteditable='true']",
          ".composer input",
          "div[contenteditable='true'][class*='input']",
        ]);
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "Send"]);
      },
      attachButton() {
        return Finder.byAriaLabels(["attach", "menu attach"]);
      },
      fileInput() {
        return document.querySelector("input[type='file']");
      },
      lastOutgoing() {
        return document.querySelector(".bubbles .bubble.is-out:last-of-type, .message.out, [class*='own']");
      },
      searchBox() {
        return Finder.first(null, ["input[type='search']", ".left-column input", "input[placeholder*='جستجو'], input[placeholder*='Search' i]"]);
      },
      loginCheck() {
        const marker = [...document.querySelectorAll("input[name='phone_number'], .qr-login, .auth-form")].find(isVisible);
        return !marker;
      },
    },

    /* ═══ Rubika Web ═══
       داده طلایی از DOM واقعی روبیکا:
       - کادر پیام: div.composer_rich_textarea[contenteditable] با placeholder «پیام بنویسید...»
       - عنوان گفتگو: عنصر [class*='peer-title'] در هدرِ نیمهٔ راست صفحه
         (برچسب ثابت «گفتگوی صوتی» هم در هدر هست — نویز است، فیلتر می‌شود)
       - پیام خروجی: .im_message_out (زیرخط، نه خط تیره)
       - ردیف «گفتگوهای بایگانی شده» در ستون کنار = نویز عنوان/نتیجه */
    rubika: {
      label: "Rubika",
      hosts: ["web.rubika.ir", "rubika.ir"],
      webUrl: "https://web.rubika.ir",
      support: { sendText: true, sendImage: true, sendFile: true, caption: true, createGroup: true },
      /* روبیکا: گفتگوها با hash رسمی `#c=<شناسه گفتگو>` باز می‌شوند (داده طلایی) —
         این مرجع در ارسال موفق یاد گرفته می‌شود و دفعه بعد مستقیم باز می‌شود (§۲۱).
         GUID خام در UI قابل جستجو نیست → جستجو با شماره (دقیق‌تر از نام) انجام می‌شود */
      resolutionSupport: { chatRef: true, phone: true, username: true, name: true },
      chatRef() {
        const h = location.hash || "";
        let m = /#c=([\w-]{4,})/.exec(h);
        if (m) return m[1];
        m = /#c\/([\w-]{4,})/.exec(h);
        return m ? m[1] : "";
      },
      openByRef(ref) {
        if (!ref || !/^[\w-]{4,}$/.test(ref)) return false;
        location.hash = `#c=${ref}`;
        return true;
      },
      chatTitle() {
        /* نویزهای شناخته‌شده — ردیف بایگانی/آرشیو و برچسب تماس نباید عنوان گفتگو شوند */
        const NOISE = /بایگانی|آرشیو|archived|گفتگوی صوتی|تماس صوتی|پیام‌های ذخیره/i;
        /* ① peer-title در نیمهٔ راست صفحه = هدر گفتگوی باز (peer-title در لیست چت‌ها هم هست؛
            با محدودیت x جلوی گرفتن ردیف‌های لیست گرفته می‌شود) */
        try {
          for (const el of document.querySelectorAll("[class*='peer-title'], [class*='peerTitle']")) {
            if (!isVisible(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.x < window.innerWidth * 0.32 || r.y > 170 || r.height > 90 || r.height < 6) continue;
            const t = (el.innerText || "").trim().split("\n")[0];
            if (t && !NOISE.test(t)) return t;
          }
        } catch { /* ادامه با selectorهای کلاسیک */ }
        /* ② selectorهای کلاسیک — با فیلتر نویز */
        for (const sel of [
          "[class*='chatHeader'] h4", "[class*='ChatHeader'] h4", "[class*='chat-header'] [class*='title']",
          "header h4", "header h1", "header .title", "header [class*='title']",
          "[class*='header'] [class*='title']", "[class*='header'] h4",
        ]) {
          try {
            const el = document.querySelector(sel);
            if (!el || !isVisible(el)) continue;
            const t = (el.innerText || "").trim().split("\n")[0];
            if (t && !NOISE.test(t)) return t;
          } catch { /* selector نامعتبر */ }
        }
        return "";
      },
      chatType: heuristicChatType,
      input() {
        /* ① selectorهای طلایی روبیکا — placeholder و کلاس composer */
        const direct = Finder.first(null, [
          "[data-placeholder*='پیام بنویسید']",
          "[placeholder*='پیام بنویسید']",
          "div[class*='composer_rich_textarea']",
          "[class*='composer'] [contenteditable='true']",
          "[class*='chatFooter'] [contenteditable='true']",
          "[class*='chat-footer'] [contenteditable='true']",
          "footer [contenteditable='true']",
        ]);
        if (direct && isVisible(direct)) return direct;
        /* ② پایین‌ترین فیلد متنیِ قابل‌مشاهده — کادر جستجو بالای صفحه است و
            با placeholder/موقعیت حذف می‌شود (قبلاً selector عامِ role=textbox
            کادر جستجو را برمی‌گرداند و پیام داخل جستجو تایپ می‌شد!)
            (v1.2.7) contenteditable=" خالی هم پوشش داده می‌شود — در DOM واقعی
            روبیکا کادر پیام با contenteditable خالی است و ='true' آن را می‌انداخت */
        let best = null;
        let bestY = -Infinity;
        for (const el of document.querySelectorAll("[contenteditable]:not([contenteditable='false']), textarea")) {
          if (!isVisible(el)) continue;
          const ph = String(el.getAttribute("placeholder") || el.getAttribute("data-placeholder") || "");
          if (/جستجو|search|یافتن/i.test(ph)) continue;
          const y = el.getBoundingClientRect().y;
          if (y > bestY) { bestY = y; best = el; }
        }
        return best;
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "ارسال"]) || document.querySelector("[class*='send'] button, button[class*='send']");
      },
      attachButton() {
        return Finder.byAriaLabels(["attach", "clip", "پیوست"]);
      },
      fileInput() {
        return document.querySelector("input[type='file']");
      },
      lastOutgoing() {
        /* .im_message_out با زیرخط — داده طلایی از DOM روبیکا */
        const outs = document.querySelectorAll(".im_message_out, [class*='message_out'], [class*='message--out'], [class*='outgoing']");
        return outs.length ? outs[outs.length - 1] : null;
      },
      searchBox() {
        return Finder.first(null, [
          "input[type='search']",
          "input[placeholder*='جستجو']",
          "[class*='search'] input",
          "input[placeholder*='Search' i]",
          "input[placeholder*='یافتن']",
        ]);
      },
      loginCheck() {
        /* فقط اینپوت شماره «قابل مشاهده» = صفحه ورود — کلاس login روی المان‌های مخفی false-positive می‌ساخت */
        const phone = [...document.querySelectorAll("input[type='tel']")].find(isVisible);
        return !phone;
      },
    },

    /* ═══ Bale Web ═══ */
    bale: {
      label: "Bale",
      hosts: ["web.bale.ai"],
      webUrl: "https://web.bale.ai",
      support: { sendText: true, sendImage: true, sendFile: true, caption: true, createGroup: true },
      resolutionSupport: { chatRef: false, phone: true, username: true, name: true },
      chatTitle() {
        const el = Finder.first(null, ["header .title", "header h4", "[class*='chat-title']"]);
        return el?.innerText?.trim() || "";
      },
      chatType: heuristicChatType,
      input() {
        return Finder.first(null, [
          "div[contenteditable='true'][role='textbox']",
          "footer div[contenteditable='true']",
          "textarea",
        ]);
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "ارسال"]);
      },
      attachButton() {
        return Finder.byAriaLabels(["attach", "clip"]);
      },
      fileInput() {
        return document.querySelector("input[type='file']");
      },
      lastOutgoing() {
        return document.querySelector("[class*='out']:last-of-type");
      },
      searchBox() {
        return Finder.first(null, ["input[type='search']", "input[placeholder*='جستجو']"]);
      },
      loginCheck() {
        const phone = [...document.querySelectorAll("input[type='tel']")].find(isVisible);
        return !phone;
      },
    },

    /* ═══ Eitaa Web ═══ */
    eitaa: {
      label: "Eitaa",
      hosts: ["web.eitaa.com", "eitaa.com"],
      webUrl: "https://web.eitaa.com",
      support: { sendText: true, sendImage: true, sendFile: true, caption: true, createGroup: false },
      resolutionSupport: { chatRef: false, phone: true, username: true, name: true },
      chatTitle() {
        const el = Finder.first(null, ["header h4", "header .title", "[class*='header'] h4"]);
        return el?.innerText?.trim() || "";
      },
      chatType: heuristicChatType,
      input() {
        return Finder.first(null, ["div[contenteditable='true']", "textarea", "input[class*='message']"]);
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "ارسال"]);
      },
      attachButton() {
        return Finder.byAriaLabels(["attach", "clip"]);
      },
      fileInput() {
        return document.querySelector("input[type='file']");
      },
      lastOutgoing() {
        return document.querySelector("[class*='out']:last-of-type");
      },
      searchBox() {
        return Finder.first(null, ["input[type='search']"]);
      },
      loginCheck() {
        const phone = [...document.querySelectorAll("input[type='tel']")].find(isVisible);
        return !phone;
      },
    },

    /* ═══ Soroush Plus ═══ */
    soroush: {
      label: "Soroush+",
      hosts: ["web.soroush.plus", "messenger.soroush.plus", "soroush.plus"],
      webUrl: "https://web.soroush.plus",
      support: { sendText: true, sendImage: true, sendFile: true, caption: false, createGroup: false },
      resolutionSupport: { chatRef: false, phone: true, username: true, name: true },
      chatTitle() {
        const el = Finder.first(null, ["header h5", "header .title", "[class*='header']"]);
        return el?.innerText?.trim().split("\n")[0] || "";
      },
      chatType: heuristicChatType,
      input() {
        return Finder.first(null, ["div[contenteditable='true']", "textarea", "input[type='text'][class*='message']"]);
      },
      sendButton() {
        return Finder.byAriaLabels(["send", "ارسال"]);
      },
      attachButton() {
        return Finder.byAriaLabels(["attach"]);
      },
      fileInput() {
        return document.querySelector("input[type='file']");
      },
      lastOutgoing() {
        return document.querySelector("[class*='out']:last-of-type");
      },
      searchBox() {
        return Finder.first(null, ["input[type='search']"]);
      },
      loginCheck() {
        const phone = [...document.querySelectorAll("input[type='tel']")].find(isVisible);
        return !phone;
      },
    },
  };

  /* ── تشخیص Adapter جاری از روی hostname ── */
  window.__RW_CURRENT_ADAPTER__ = null;
  function detectAdapter() {
    const host = location.hostname.toLowerCase();
    for (const [key, adapter] of Object.entries(Adapters)) {
      if (adapter.hosts.some((h) => host === h || host.endsWith("." + h))) {
        return { key, adapter };
      }
    }
    return null;
  }

  window.__RW_ADAPTERS__ = Adapters;
  window.__RW_DETECT_ADAPTER__ = detectAdapter;
  window.__RW_FINDER__ = Finder;
  window.__RW_DEFAULT_RESOLUTION_SUPPORT__ = DEFAULT_RESOLUTION_SUPPORT;
})();
