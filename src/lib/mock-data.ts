/* ─── Seeded mock data at real product scale ─── */
import {
  Account, ActivityEvent, AppNotification, Campaign, Contact, ContactGroup,
  Platform, PlatformRule, Pool, QueueItem, SystemUser,
  PLATFORMS, PLATFORM_LABEL,
  AuditEntry, AccountEvent, CampaignJourney, Conversation, ErrorClass, InboxMessage,
  MessageTemplate, Project, Segment, SuppressionEntry, UsageRow,
} from "./types";
import { mulberry32, randomName } from "./fa";

export const rand = mulberry32(1404);

const faDigits = (s: string) => s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
const pad3 = (n: number) => faDigits(String(n).padStart(3, "0"));

/* ---------- Accounts ---------- */
const PLATFORM_COUNT: Record<Platform, number> = {
  rubika: 380, bale: 262, telegram: 210, whatsapp: 190, eitaa: 120, soroush: 85,
};

// Status assignment: 1182 active, 31 limited, 18 blocked, 16 connection_error
function statusFor(platform: Platform, i: number): Account["status"] {
  const key = `${platform}-${i}`;
  if (platform === "bale" && i === 12) return "limited"; // سناریوی زنده: بله 012 محدود شد
  if (platform === "whatsapp" && i === 4) return "connection_error"; // واتساپ 004 نیاز به بررسی
  if (platform === "rubika" && i === 21) return "active"; // روبیکا 021 دیروز متوقف شد و دوباره فعال شده
  if (platform === "telegram" && i === 8) return "active"; // تلگرام 008 دوباره فعال شد
  const h = (Math.abs(hashStr(key)) % 1247);
  if (h < 31) return "limited";
  if (h < 49) return "blocked";
  if (h < 65) return "connection_error";
  if (h < 75) return "inactive";
  return "active";
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const ERRORS = [
  "Rate Limit از سرویس مقصد",
  "خطای احراز هویت (401)",
  "پاسخ دریافت نشد (Timeout)",
  "محدودیت ارسال از طرف سرویس مقصد",
  "نشست منقضی شده است",
];

function buildAccounts(): Account[] {
  const out: Account[] = [];
  let n = 0;
  for (const platform of PLATFORMS) {
    const count = PLATFORM_COUNT[platform];
    for (let i = 1; i <= count; i++) {
      n++;
      const status = statusFor(platform, i);
      const dailyLimit = status === "active" ? [20, 20, 20, 40, 40, 100, 60][n % 7] : 20;
      const sentToday =
        status === "active" ? Math.floor(rand() * (dailyLimit + 1)) : status === "limited" ? dailyLimit : 0;
      const health =
        status === "active" ? 82 + Math.floor(rand() * 18) : status === "limited" ? 55 + Math.floor(rand() * 20) : 20 + Math.floor(rand() * 40);
      out.push({
        id: `${platform}-${pad3(i)}`,
        platform,
        name: `${PLATFORM_LABEL[platform]} ${pad3(i)}`,
        phone: `091${2 + (n % 8)}${String(1000000 + ((n * 7919) % 8999999)).slice(0, 7)}`,
        status,
        health,
        sentToday,
        dailyLimit,
        remaining: Math.max(0, dailyLimit - sentToday),
        lastActive: status === "inactive" ? "دیروز" : `${String(8 + (n % 10)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`,
        lastError:
          status === "limited" ? "محدودیت ارسال از طرف سرویس مقصد"
          : status === "blocked" ? "مسدودی از طرف سرویس مقصد"
          : status === "connection_error" ? ERRORS[n % ERRORS.length]
          : null,
        authMethod: platform === "whatsapp" ? "qr" : "phone_code",
        connectedAt: "۱۴۰۴/۰۵/۱۴",
        poolId: `pool-${platform}`,
        pausedReason: status === "limited" ? "محدودیت ارسال از طرف سرویس مقصد" : undefined,
        remainingMessages: status === "limited" ? 84 : undefined,
      });
    }
  }
  return out;
}

/* ---------- Contacts ---------- */
const CITIES = ["تهران", "مشهد", "اصفهان", "شیراز", "تبریز", "کرج", "اهواز", "قم", "رشت", "یزد"];
const CATEGORIES = ["طلا و جواهر", "پوشاک", "املاک", "خدمات وب", "رستوران", "آموزش", "پزشکی", "خودرو"];
const SOURCES = ["ورود دستی", "فایل اکسل", "نمایشگاه", "وب‌سایت", "معرفی مشتری", "کمپین مهر"];
const TAG_POOL = ["VIP", "سرنخ", "مشتری فعلی", "پیگیری فوری", "عمده‌فروش", "عضو باشگاه", "نمایشگاه مهر"];

function buildContacts(): Contact[] {
  const total = 58420;
  const out: Contact[] = new Array(total);
  const COMPANIES = ["مبلمان آرا", "گالری طلا نگین", "املاک سبزه‌میدان", "وب‌سازان پارس", "رستوران شاندیز", "آموزشگاه آینده", "کلینیک سلامت", "بازرگانی رهنما", "پوشاک ستاره", "خودرو گستر"];
  const EXPERTS = ["سارا محمدی", "امیر کریمی", "مریم رضایی", "حسین نوری"];
  for (let i = 0; i < total; i++) {
    const r = rand;
    const channelCount = 2 + Math.floor(r() * 4); // 2..5
    const shuffled = [...PLATFORMS].sort(() => r() - 0.5);
    const channels = shuffled.slice(0, channelCount);
    const tagCount = r() > 0.55 ? 1 + Math.floor(r() * 2) : 0;
    const tags: string[] = [];
    for (let t = 0; t < tagCount; t++) {
      const tag = TAG_POOL[Math.floor(r() * TAG_POOL.length)];
      if (!tags.includes(tag)) tags.push(tag);
    }
    /* رضایت: ۸۲٪ مجاز، ۱۱٪ نامشخص، ۷٪ عدم دریافت */
    const cr = r();
    const consent = cr < 0.82 ? "allowed" : cr < 0.93 ? "unknown" : "opted_out";
    const replied = consent === "allowed" && r() > 0.72;
    const city = CITIES[Math.floor(r() * CITIES.length)];
    const category = CATEGORIES[Math.floor(r() * CATEGORIES.length)];
    out[i] = {
      id: `c-${i + 1}`,
      name: randomName(r),
      phone: `091${2 + Math.floor(r() * 8)}${String(1000000 + Math.floor(r() * 8999999))}`,
      channels,
      tags,
      city,
      category,
      source: SOURCES[Math.floor(r() * SOURCES.length)],
      addedAt: "۱۴۰۴/۰۶/۲۱",
      lastCampaign: r() > 0.6 ? "پیشنهاد ویژه مهر" : undefined,
      consent,
      company: r() > 0.3 ? COMPANIES[Math.floor(r() * COMPANIES.length)] : undefined,
      lastInteraction: r() > 0.4 ? `${faDigits(String(1 + Math.floor(r() * 20)))} روز پیش` : undefined,
      satisfaction: consent === "opted_out" ? "angry" : replied ? (r() > 0.2 ? "satisfied" : "neutral") : r() > 0.5 ? "neutral" : "unknown",
      notes: r() > 0.85 ? "در تماس قبلی علاقه‌مند به طراحی فروشگاهی بود." : undefined,
      expert: r() > 0.5 ? EXPERTS[Math.floor(r() * EXPERTS.length)] : undefined,
      replied,
    };
  }
  return out;
}

/* ---------- Campaigns ---------- */
function buildCampaigns(): Campaign[] {
  return [
    {
      id: "cmp-1",
      name: "پیشنهاد ویژه مهر",
      status: "running",
      audienceCount: 32500,
      platforms: ["telegram", "rubika", "bale", "eitaa"],
      accountsUsed: 46,
      message:
        "سلام {{نام}} 👋\nبرای کسب‌وکار {{نام کسب‌وکار}} به مناسبت آغاز مهر، «پیشنهاد ویژه مهر» راساوب فعال شد:\n✅ ۳۰٪ تخفیف طراحی سایت\n✅ مشاوره رایگان سئو\n✅ تحویل ۷ روزه\nفرصت محدود است — همین حالا پاسخ دهید تا نوبت شما رزرو شود.\nکارشناس شما: {{نام کارشناس}}",
      plannedCount: 32500,
      sentCount: 23725,
      successCount: 23211,
      failedCount: 514,
      queuedCount: 8210,
      stoppedCount: 565,
      startAt: "08:00",
      endAt: "18:00",
      startDate: "امروز",
      createdAt: "۱۴۰۴/۰۷/۰۸",
      timeline: [
        { time: "08:00", label: "کمپین طبق زمان‌بندی شروع شد", type: "start" },
        { time: "09:20", label: "۱۲۰ پیام با موفقیت ارسال شد", type: "sent" },
        { time: "11:35", label: "اکانت بله 012 محدود شد — ارسال از این اکانت متوقف شد", type: "warning" },
        { time: "12:05", label: "۸۴ پیام باقی‌مانده اکانت بله 012 به صف منتقل شد", type: "info" },
        { time: "13:10", label: "اکانت روبیکا 021 پس از تأیید، دوباره فعال شد و ارسال ادامه یافت", type: "resume" },
      ],
      segmentId: "seg-1",
      segmentName: "فروشندگان مبلمان در تهران",
      requestedBy: "امیر کریمی",
      hasJourney: true,
      personalization: true,
      suppressedCount: 412,
    },
    {
      id: "cmp-2",
      name: "معرفی خدمات طراحی سایت مهر",
      status: "completed",
      audienceCount: 5000,
      platforms: ["rubika", "bale"],
      accountsUsed: 12,
      message:
        "سلام، ما تیم راساوب هستیم 🌐\nطراحی سایت شرکتی و فروشگاهی با تخفیف ویژه مهر:\n• دامنه و هاست رایگان یک‌ساله\n• پشتیبانی ۶ ماهه\nبرای دریافت نمونه‌کارها، «نمونه‌کار» را ارسال کنید.",
      plannedCount: 5000,
      sentCount: 5000,
      successCount: 4879,
      failedCount: 121,
      queuedCount: 0,
      stoppedCount: 0,
      startAt: "08:00",
      endAt: "18:00",
      startDate: "دیروز",
      createdAt: "۱۴۰۴/۰۷/۰۷",
      timeline: [
        { time: "08:00", label: "کمپین شروع شد", type: "start" },
        { time: "09:20", label: "۱۲۰ پیام ارسال شد", type: "sent" },
        { time: "11:35", label: "اکانت روبیکا 021 محدود شد — ارسال از این اکانت متوقف شد", type: "warning" },
        { time: "11:36", label: "۸۴ پیام باقی‌مانده وارد صف شد و هشدار برای مدیر ثبت گردید", type: "info" },
        { time: "13:10", label: "اکانت روبیکا 021 دوباره فعال شد و ارسال از صف ادامه پیدا کرد", type: "resume" },
        { time: "17:48", label: "کمپین با موفقیت تکمیل شد (۴٬۸۷۹ موفق / ۱۲۱ ناموفق)", type: "end" },
      ],
      segmentId: "seg-4",
      segmentName: "سرنخ‌های نمایشگاه",
      personalization: false,
      suppressedCount: 87,
    },
    {
      id: "cmp-3",
      name: "پیگیری سرنخ‌های نمایشگاه",
      status: "scheduled",
      audienceCount: 6110,
      platforms: ["whatsapp", "telegram"],
      accountsUsed: 9,
      message:
        "سلام {{نام}}، از نمایشگاه مهر با شما آشنا شدیم 🤝\nراساوب برای مشاغل نمایشگاهی، پکیج ویژه‌ای آماده کرده است.\nمایل به دریافت کاتالوگ هستید؟",
      plannedCount: 6110,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      queuedCount: 6110,
      stoppedCount: 0,
      startAt: "09:00",
      endAt: "17:00",
      startDate: "فردا",
      createdAt: "۱۴۰۴/۰۷/۰۹",
      timeline: [{ time: "—", label: "کمپین برای فردا ساعت ۰۹:۰۰ زمان‌بندی شد", type: "info" }],
      segmentId: "seg-4",
      segmentName: "سرنخ‌های نمایشگاه",
      hasJourney: true,
      personalization: true,
      suppressedCount: 130,
    },
    {
      id: "cmp-4",
      name: "تخفیف ویژه اعضای باشگاه مشتریان",
      status: "completed",
      audienceCount: 9870,
      platforms: ["eitaa", "soroush", "bale"],
      accountsUsed: 18,
      message: "عضو گرامی باشگاه مشتریان، کد تخفیف اختصاصی شما فعال شد: RASA20 🎁",
      plannedCount: 9870,
      sentCount: 9870,
      successCount: 9610,
      failedCount: 260,
      queuedCount: 0,
      stoppedCount: 0,
      startAt: "08:00",
      endAt: "18:00",
      startDate: "۳ روز پیش",
      createdAt: "۱۴۰۴/۰۷/۰۵",
      timeline: [
        { time: "08:00", label: "کمپین شروع شد", type: "start" },
        { time: "17:52", label: "کمپین تکمیل شد", type: "end" },
      ],
      personalization: false,
      suppressedCount: 54,
    },
    {
      id: "cmp-5",
      name: "اطلاع‌رسانی جشنواره پاییزه",
      status: "paused",
      audienceCount: 15230,
      platforms: ["telegram", "rubika", "whatsapp"],
      accountsUsed: 24,
      message: "جشنواره پاییزه راساوب آغاز شد! تا ۴۰٪ تخفیف روی خدمات طراحی و سئو.",
      plannedCount: 15230,
      sentCount: 7410,
      successCount: 7202,
      failedCount: 208,
      queuedCount: 7820,
      stoppedCount: 0,
      startAt: "08:00",
      endAt: "18:00",
      startDate: "۲ روز پیش",
      createdAt: "۱۴۰۴/۰۷/۰۶",
      timeline: [
        { time: "08:00", label: "کمپین شروع شد", type: "start" },
        { time: "14:30", label: "کمپین به‌صورت موقت توسط مدیر متوقف شد", type: "warning" },
      ],
      personalization: false,
      suppressedCount: 201,
    },
    {
      id: "cmp-6",
      name: "معرفی پکیج سئو زمستان",
      status: "pending_approval",
      audienceCount: 4185,
      platforms: ["telegram", "bale"],
      accountsUsed: 0,
      message:
        "سلام {{نام}}،\nزمستان بدون دیده‌شدن در گوگل؟ 📉\nپکیج سئو زمستان راساوب با ۲۵٪ تخفیف ویژه:\n✅ تحلیل کامل سایت\n✅ بهینه‌سازی محتوا\n✅ گزارش ماهانه شفاف\nبرای مشاوره رایگان، همین پیام را پاسخ دهید.",
      plannedCount: 4185,
      sentCount: 0,
      successCount: 0,
      failedCount: 0,
      queuedCount: 0,
      stoppedCount: 0,
      startAt: "08:00",
      endAt: "18:00",
      startDate: "—",
      createdAt: "۱۴۰۴/۰۷/۱۰",
      timeline: [
        { time: "10:24", label: "کمپین توسط امیر کریمی برای تأیید ارسال شد", type: "info" },
      ],
      segmentId: "seg-2",
      segmentName: "فروشندگان مبلمان",
      requestedBy: "امیر کریمی",
      hasJourney: false,
      personalization: true,
      suppressedCount: 15,
    },
    {
      id: "cmp-7",
      name: "تشکر از مشتریان قدیمی",
      status: "completed",
      audienceCount: 9870,
      platforms: ["eitaa"],
      accountsUsed: 8,
      message: "از همراهی شما سپاسگزاریم 🌹 کد تخفیف وفاداری: LOYAL15",
      plannedCount: 9870,
      sentCount: 9870,
      successCount: 9812,
      failedCount: 58,
      queuedCount: 0,
      stoppedCount: 0,
      startAt: "10:00",
      endAt: "16:00",
      startDate: "۶ روز پیش",
      createdAt: "۱۴۰۴/۰۷/۰۲",
      timeline: [{ time: "10:00", label: "کمپین شروع شد", type: "start" }, { time: "15:20", label: "کمپین تکمیل شد", type: "end" }],
      personalization: false,
      suppressedCount: 33,
    },
  ];
}

/* ---------- Queue ---------- */
function buildQueue(accounts: Account[], campaigns: Campaign[]): QueueItem[] {
  const items: QueueItem[] = [];
  const activeAccounts = accounts.filter((a) => a.status === "active" || a.status === "limited").slice(0, 400);
  const cmp1 = campaigns[0];
  const cmp3 = campaigns[2];
  const cmp5 = campaigns[4];
  // 3280 در صف
  for (let i = 0; i < 3280; i++) {
    const acc = activeAccounts[i % activeAccounts.length];
    const cmp = i % 3 === 0 ? cmp1 : i % 3 === 1 ? cmp5 : cmp3;
    const isStoppedAccount = acc.status === "limited";
    items.push({
      id: `q-${i + 1}`,
      campaignId: cmp.id,
      campaignName: cmp.name,
      contactName: randomName(rand),
      phone: `091${2 + (i % 8)}${String(1000000 + ((i * 6397) % 8999999)).slice(0, 7)}`,
      platform: acc.platform,
      accountId: acc.id,
      accountName: acc.name,
      status: isStoppedAccount ? (i % 4 === 0 ? "paused" : "queued") : "queued",
      scheduledAt: `${String(8 + Math.floor(i / 400)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}`,
      attempts: isStoppedAccount ? 1 : 0,
      lastError: isStoppedAccount ? "اکانت محدود شد — در انتظار ادامه از صف" : null,
    });
  }
  // در حال ارسال
  for (let i = 0; i < 24; i++) {
    const acc = activeAccounts[i];
    items.push({
      id: `qs-${i}`,
      campaignId: cmp1.id,
      campaignName: cmp1.name,
      contactName: randomName(rand),
      phone: `091${2 + (i % 8)}${String(1000000 + ((i * 6397 + 55) % 8999999)).slice(0, 7)}`,
      platform: acc.platform,
      accountId: acc.id,
      accountName: acc.name,
      status: "sending",
      scheduledAt: "14:32",
      attempts: 1,
      lastError: null,
    });
  }
  // ارسال موفق (نمونه امروز)
  for (let i = 0; i < 120; i++) {
    const acc = activeAccounts[(i * 3) % activeAccounts.length];
    items.push({
      id: `qok-${i}`,
      campaignId: cmp1.id,
      campaignName: cmp1.name,
      contactName: randomName(rand),
      phone: `091${2 + (i % 8)}${String(1000000 + ((i * 6397 + 991) % 8999999)).slice(0, 7)}`,
      platform: acc.platform,
      accountId: acc.id,
      accountName: acc.name,
      status: "sent",
      scheduledAt: `${String(8 + (i % 7)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`,
      attempts: 1,
      lastError: null,
    });
  }
  // خطا / متوقف — با طبقه‌بندی هوشمند خطا
  for (let i = 0; i < 40; i++) {
    const failed = i % 2 === 0;
    const errorClass: ErrorClass = failed ? (i % 4 === 0 ? "temporary" : i % 6 === 0 ? "invalid_recipient" : "temporary") : "restriction";
    items.push({
      id: `qe-${i}`,
      campaignId: cmp1.id,
      campaignName: cmp1.name,
      contactName: randomName(rand),
      phone: `091${2 + (i % 8)}${String(1000000 + ((i * 6397 + 313) % 8999999)).slice(0, 7)}`,
      platform: i % 4 === 0 ? "rubika" : "bale",
      accountId: i % 4 === 0 ? "rubika-۰۲۱" : "bale-۰۱۲",
      accountName: i % 4 === 0 ? "روبیکا ۰۲۱" : "بله ۰۱۲",
      status: failed ? "failed" : "stopped",
      scheduledAt: `${String(9 + (i % 6)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}`,
      attempts: failed ? 3 : 1,
      lastError: failed ? "پاسخ دریافت نشد (Timeout)" : "محدودیت ارسال از طرف سرویس مقصد",
      errorClass,
    });
  }
  return items;
}

/* ---------- Activity / Notifications ---------- */
function buildActivity(): ActivityEvent[] {
  return [
    { id: "e1", type: "account_stopped", title: "اکانت بله 012 متوقف شد", detail: "علت: محدودیت ارسال از طرف سرویس مقصد — ۸۴ پیام باقی‌مانده به صف منتقل شد", at: "12:05", minutesAgo: 3 },
    { id: "e2", type: "messages_sent", title: "۱۲۰ پیام با موفقیت ارسال شد", detail: "کمپین «پیشنهاد ویژه مهر»", at: "11:42", minutesAgo: 18 },
    { id: "e3", type: "campaign_started", title: "کمپین «پیشنهاد ویژه مهر» شروع شد", detail: "۳۲٬۵۰۰ مخاطب — ۴ پلتفرم — ۴۶ اکانت", at: "08:00", minutesAgo: 62 },
    { id: "e4", type: "messages_failed", title: "۸ پیام با خطا مواجه شدند", detail: "Timeout — تلاش مجدد خودکار فعال است", at: "10:55", minutesAgo: 97 },
    { id: "e5", type: "account_resumed", title: "اکانت تلگرام 008 دوباره فعال شد", detail: "پس از تأیید سیگنال سرویس مقصد، ارسال از صف ادامه پیدا کرد", at: "09:30", minutesAgo: 140 },
    { id: "e6", type: "import", title: "۱۲٬۵۸۰ شماره وارد شد", detail: "۱۲٬۱۱۰ معتبر — ۳۵۰ تکراری — ۱۲۰ نامعتبر", at: "09:10", minutesAgo: 170 },
  ];
}

function buildNotifications(): AppNotification[] {
  return [
    { id: "n1", type: "error", category: "account", title: "اکانت بله 012 محدود شد", body: "سرویس مقصد محدودیت ارسال اعلام کرد. ارسال از این اکانت متوقف و ۸۴ پیام باقی‌مانده به صف منتقل شد.", at: "12:05", minutesAgo: 3, read: false },
    { id: "n2", type: "warning", category: "account", title: "اتصال واتساپ 004 نیاز به بررسی دارد", body: "سه تلاش متوالی برای اتصال ناموفق بود. نشست این اکانت منقضی شده است.", at: "11:20", minutesAgo: 25, read: false },
    { id: "n3", type: "success", category: "account", title: "تلگرام 008 دوباره فعال شد", body: "پس از تأیید سیگنال سرویس مقصد، اکانت به چرخه ارسال بازگشت.", at: "09:30", minutesAgo: 140, read: true },
    { id: "n4", type: "info", category: "campaign", title: "کمپین مهر 73% پیشرفت کرده است", body: "۲۳٬۷۲۵ از ۳۲٬۵۰۰ پیام پردازش شد. پیش‌بینی تکمیل: تا پایان بازه امروز.", at: "13:00", minutesAgo: 15, read: false },
    { id: "n5", type: "warning", category: "campaign", title: "کمپین «معرفی پکیج سئو زمستان» منتظر تأیید شماست", body: "امیر کریمی کمپین را برای تأیید ارسال کرد: ۴٬۱۸۵ مخاطب — ۲ پلتفرم.", at: "10:24", minutesAgo: 48, read: false },
    { id: "n6", type: "success", category: "messages", title: "۲۳ پاسخ جدید در صندوق ورودی", body: "پاسخ‌های کمپین «پیشنهاد ویژه مهر» دریافت شد. ۹ گفتگو اختصاص نیافته است.", at: "13:12", minutesAgo: 8, read: false },
    { id: "n7", type: "warning", category: "system", title: "۸ پیام با خطا مواجه شد", body: "آخرین خطا: Timeout. سیاست «تلاش مجدد» برای این پلتفرم فعال است.", at: "10:55", minutesAgo: 97, read: true },
    { id: "n8", type: "info", category: "messages", title: "گفتگوی جدید به شما اختصاص یافت", body: "گفتگوی «علی رضایی — واتساپ» توسط امیر کریمی به شما اختصاص یافت.", at: "12:40", minutesAgo: 30, read: true },
  ];
}

/* ---------- Users, Rules, Pools, Groups ---------- */
function buildUsers(): SystemUser[] {
  return [
    { id: "u0", name: "مهدی راسا", email: "mehdi@rasaweb.ir", role: "owner", status: "active", lastLogin: "امروز ۰۷:۵۵", avatarColor: "bg-slate-800", canApprove: true },
    { id: "u1", name: "سارا محمدی", email: "sara@rasaweb.ir", role: "admin", status: "active", lastLogin: "امروز ۰۸:۱۲", avatarColor: "bg-teal-600", canApprove: true },
    { id: "u2", name: "امیر کریمی", email: "amir@rasaweb.ir", role: "campaign_manager", status: "active", lastLogin: "امروز ۰۹:۴۰", avatarColor: "bg-emerald-600", canApprove: false },
    { id: "u3", name: "مریم رضایی", email: "maryam@rasaweb.ir", role: "operator", status: "active", lastLogin: "امروز ۱۰:۰۵", avatarColor: "bg-amber-600" },
    { id: "u4", name: "حسین نوری", email: "hosein@rasaweb.ir", role: "operator", status: "active", lastLogin: "دیروز ۱۷:۵۵", avatarColor: "bg-sky-600" },
    { id: "u5", name: "نگار شریفی", email: "negar@rasaweb.ir", role: "viewer", status: "active", lastLogin: "دیروز ۱۴:۲۲", avatarColor: "bg-rose-600" },
    { id: "u6", name: "بهرام صادقی", email: "bahram@rasaweb.ir", role: "campaign_manager", status: "suspended", lastLogin: "۵ روز پیش", avatarColor: "bg-violet-600", canApprove: false },
    { id: "u7", name: "لیلا احمدی", email: "leila@rasaweb.ir", role: "custom", status: "active", lastLogin: "امروز ۱۱:۳۰", avatarColor: "bg-indigo-600", customRoleName: "پشتیبان Inbox", canApprove: false },
  ];
}

function buildRules(): PlatformRule[] {
  return PLATFORMS.map((p) => ({
    platform: p,
    enabled: true,
    dailyLimit: 20,
    windowStart: "08:00",
    windowEnd: "18:00",
    queueSpeed: "normal",
    errorBehavior: "stop_account",
    resumeBehavior: "auto_resume",
  }));
}

function buildPools(): Pool[] {
  return PLATFORMS.map((p) => ({
    id: `pool-${p}`,
    platform: p,
    name: `استخر ${PLATFORM_LABEL[p]}`,
    accountIds: [],
  }));
}

function buildGroups(): ContactGroup[] {
  return [
    { id: "g1", name: "مشتریان طلا و جواهر", count: 8420, color: "bg-amber-500" },
    { id: "g2", name: "مشتریان تهران", count: 15230, color: "bg-teal-500" },
    { id: "g3", name: "سرنخ‌های نمایشگاه", count: 6110, color: "bg-sky-500" },
    { id: "g4", name: "مشتریان قدیمی", count: 9870, color: "bg-emerald-500" },
    { id: "g5", name: "مخاطبان کمپین مهر", count: 12580, color: "bg-violet-500" },
    { id: "g6", name: "بدون گروه", count: 6210, color: "bg-slate-400" },
  ];
}

/* ---------- Hourly chart data ---------- */
export const HOURLY_SENDS = [
  { hour: "۰۸", sent: 412, failed: 12 },
  { hour: "۰۹", sent: 834, failed: 21 },
  { hour: "۱۰", sent: 1102, failed: 18 },
  { hour: "۱۱", sent: 1284, failed: 34 },
  { hour: "۱۲", sent: 990, failed: 41 },
  { hour: "۱۳", sent: 1160, failed: 22 },
  { hour: "۱۴", sent: 1345, failed: 16 },
  { hour: "۱۵", sent: 780, failed: 9 },
  { hour: "۱۶", sent: 320, failed: 4 },
  { hour: "۱۷", sent: 193, failed: 6 },
];

/* ---------- Health history (7 days) ---------- */
export const WEEKLY_SENDS = [
  { day: "ش", sent: 6420, success: 6180 },
  { day: "ی", sent: 7100, success: 6902 },
  { day: "د", sent: 6890, success: 6610 },
  { day: "س", sent: 7480, success: 7310 },
  { day: "چ", sent: 7930, success: 7710 },
  { day: "پ", sent: 8210, success: 8014 },
  { day: "ج", sent: 8420, success: 8205 },
];

/* ---------- Unified Inbox ---------- */
function buildConversations(): Conversation[] {
  const mk = (
    id: string, contactId: string, contactName: string, phone: string, platform: Platform,
    tags: string[], campaign: string | undefined, replySupported: boolean,
    msgs: Array<[("in" | "out"), string, string, string, InboxMessage["status"]?]>, // [dir, body, time, sender, status]
    opts?: { unread?: number; isImportant?: boolean; assignedTo?: string | null; state?: Conversation["state"]; date?: string }
  ): Conversation => {
    const messages: InboxMessage[] = msgs.map((m, i) => ({
      id: `${id}-m${i}`,
      conversationId: id,
      direction: m[0],
      body: m[1],
      at: m[2],
      sender: m[3],
      status: m[4] ?? (m[0] === "in" ? "read" : "delivered"),
      date: opts?.date ?? "امروز",
      relatedCampaign: campaign,
      fromAI: m[0] === "out" && m[1].includes("〔پیشنهاد AI〕"),
    }));
    const last = messages[messages.length - 1];
    return {
      id,
      contactId,
      contactName,
      phone,
      platform,
      lastMessage: last.body.replace("〔پیشنهاد AI〕 ", ""),
      lastAt: last.at,
      minutesAgo: opts?.unread ? 4 + (parseInt(id.replace(/\D/g, "")) % 40) : 10 + (parseInt(id.replace(/\D/g, "")) % 200),
      unread: opts?.unread ?? 0,
      tags,
      state: opts?.state ?? "open",
      assignedTo: opts?.assignedTo ?? null,
      isImportant: opts?.isImportant ?? false,
      replied: last.direction === "out",
      campaign,
      replySupported,
      messages,
    };
  };

  return [
    mk("cnv-1", "c-12", "علی رضایی", "09121234567", "whatsapp", ["سرنخ", "نمایشگاه مهر"], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}} 👋 برای کسب‌وکار شما پیشنهاد ویژه طراحی سایت فعال شد...", "08:14", "واتساپ 007", "read"],
      ["in", "سلام، وقتتون بخیر. دقیقاً چه خدماتی شامل تخفیف میشه؟", "13:02", "علی رضایی"],
      ["out", "〔پیشنهاد AI〕 سلام و وقت بخیر 🌿 تخفیف ۳۰٪ شامل طراحی سایت شرکتی و فروشگاهی + مشاوره سئو رایگان می‌شه. اگه موجب تسریعه، نمونه‌کارهای مرتبط با کسب‌وکارتون رو هم براتون می‌فرستم.", "13:05", "سارا محمدی", "delivered"],
      ["in", "ممنون. لطفاً نمونه‌کار فروشگاهی بفرستید 🙏", "13:21", "علی رضایی"],
    ], { unread: 2 }),
    mk("cnv-2", "c-47", "مریم حسینی", "09132345678", "telegram", ["VIP"], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}}، پیشنهاد ویژه مهر راساوب فعال شد: ۳۰٪ تخفیف طراحی سایت ✅", "08:31", "تلگرام 014", "read"],
      ["in", "قیمت پایه چنده؟", "12:44", "مریم حسینی"],
    ], { unread: 1, isImportant: true }),
    mk("cnv-3", "c-108", "حسین کاظمی", "09143456789", "bale", ["مشتری فعلی"], undefined, true, [
      ["out", "سلام، سفارش شما ثبت شد و تا ۲ روز کاری ارسال می‌شود ✅", "10:02", "بله 021", "read"],
      ["in", "ممنون از پیگیری‌تون", "10:20", "حسین کاظمی"],
      ["out", "خواهش می‌کنم 🌹 در خدمتیم", "10:22", "مریم رضایی", "read"],
    ], { assignedTo: "مریم رضایی", state: "resolved" }),
    mk("cnv-4", "c-201", "زهرا موسوی", "09154567890", "rubika", ["عمده‌فروش"], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}} 👋 برای کسب‌وکار شما پیشنهاد ویژه داریم...", "09:05", "روبیکا 030", "delivered"],
      ["in", "سلام. برای خرید عمده هم تخفیف دارید؟", "13:40", "زهرا موسوی"],
    ], { unread: 1 }),
    mk("cnv-5", "c-305", "رضا شهمرادی", "09165678901", "whatsapp", [], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}}، پیشنهاد ویژه مهر فعال شد ✅", "08:44", "واتساپ 002", "read"],
      ["in", "لطفاً از لیست ارسال حذفم کنید. علاقه‌ای ندارم.", "11:15", "رضا شهمرادی"],
    ], { unread: 1, isImportant: true, state: "pending" }),
    mk("cnv-6", "c-402", "فاطمه نادری", "09176789012", "eitaa", ["عضو باشگاه"], "تخفیف ویژه اعضای باشگاه مشتریان", true, [
      ["out", "عضو گرامی، کد تخفیف اختصاصی شما فعال شد: RASA20 🎁", "09:10", "ایتا 009", "read"],
      ["in", "این کد تا کی اعتبار داره؟", "12:58", "فاطمه نادری"],
      ["out", "〔پیشنهاد AI〕 سلام 🌸 کد RASA20 تا پایان مهر اعتبار داره و قابل ترکیب با جشنواره پاییزه هم هست. اگه سوالی درباره محصولات داشتید در خدمتم.", "13:00", "حسین نوری", "delivered"],
    ], { assignedTo: "حسین نوری" }),
    mk("cnv-7", "c-488", "امیر جلالی", "09187890123", "telegram", ["پیگیری فوری"], undefined, true, [
      ["out", "سلام، پیگیری درخواست طراحی سایت شما: پیش‌فاکتور آماده شد.", "11:30", "تلگرام 005", "read"],
      ["in", "عالیه، فردا صحبت کنیم", "11:41", "امیر جلالی"],
    ], { assignedTo: "سارا محمدی", isImportant: true }),
    mk("cnv-8", "c-513", "نگار توکلی", "09198901234", "soroush", ["سرنخ"], undefined, false, [
      ["out", "سلام {{نام}}، راساوب برای کسب‌وکار شما پیشنهاد ویژه‌ای داریم.", "10:11", "سروش 004", "sent"],
    ], { state: "pending" }),
    mk("cnv-9", "c-590", "محمد صالحی", "09119012345", "rubika", [], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}} 👋 پیشنهاد ویژه مهر راساوب فعال شد...", "09:22", "روبیکا 018", "read"],
      ["in", "چه مدت طول می‌کشه سایت آماده بشه؟", "13:33", "محمد صالحی"],
    ], { unread: 1 }),
    mk("cnv-10", "c-617", "سمیرا قاسمی", "09120123456", "whatsapp", ["VIP", "مشتری فعلی"], undefined, true, [
      ["out", "سلام سمیرا خانم 🌹 تمدید قرارداد پشتیبانی شما با ۱۵٪ تخفیف وفاداری فعال شد.", "11:55", "واتساپ 011", "read"],
      ["in", "ممنون! فاکتور رو برام بفرستید", "13:47", "سمیرا قاسمی"],
    ], { assignedTo: "سارا محمدی", isImportant: true }),
    mk("cnv-11", "c-703", "کاوه رستمی", "09131234511", "bale", ["سرنخ"], "پیگیری سرنخ‌های نمایشگاه", true, [
      ["out", "سلام {{نام}}، از نمایشگاه مهر با شما آشنا شدیم 🤝", "09:40", "بله 015", "delivered"],
    ], { state: "pending" }),
    mk("cnv-12", "c-755", "الهام کریمی", "09142345622", "telegram", [], "پیشنهاد ویژه مهر", true, [
      ["out", "سلام {{نام}}، پیشنهاد ویژه مهر فعال شد ✅", "08:52", "تلگرام 022", "read"],
      ["in", "سلام. برای رستوران هم سایت می‌زنید؟ منو آنلاین میخوایم", "13:18", "الهام کریمی"],
    ], { unread: 1 }),
  ];
}

/* ---------- Suppression List ---------- */
function buildSuppression(): SuppressionEntry[] {
  return [
    { id: "sup-1", name: "رضا شهمرادی", phone: "09165678901", reason: "opt_out_request", note: "در گفتگوی واتساپ درخواست حذف از لیست ارسال را اعلام کرد", addedBy: "سیستم (خودکار)", addedAt: "امروز ۱۱:۱۶", source: "automatic" },
    { id: "sup-2", name: "کامران دولتی", phone: "09111112233", reason: "invalid_number", note: "شماره در سرویس مقصد وجود ندارد (Invalid Recipient)", addedBy: "سیستم (خودکار)", addedAt: "امروز ۱۰:۵۵", source: "automatic" },
    { id: "sup-3", name: "شعله میرزایی", phone: "09122223344", reason: "blocked_number", note: "شماره مسدود شده توسط سرویس مقصد", addedBy: "سیستم (خودکار)", addedAt: "دیروز ۱۶:۲۰", source: "automatic" },
    { id: "sup-4", name: "شرکت پخش البرز", phone: "09133334455", reason: "internal_customer", note: "مشتری داخلی — ارسال کمپین مجاز نیست", addedBy: "سارا محمدی", addedAt: "۱۴۰۴/۰۷/۰۵", source: "manual" },
    { id: "sup-5", name: "محسن فرهادی", phone: "09144445566", reason: "manual_list", note: "درخواست مدیر — در حال مذاکره مستقیم", addedBy: "امیر کریمی", addedAt: "۱۴۰۴/۰۷/۰۳", source: "manual" },
    { id: "sup-6", name: "کاربر حذف‌شده #4471", phone: "09155556677", reason: "deleted_contact", note: "مخاطب از دفترچه حذف شد", addedBy: "سیستم (خودکار)", addedAt: "۱۴۰۴/۰۷/۰۱", source: "automatic" },
    { id: "sup-7", name: "نعیمه سلطانی", phone: "09166667788", reason: "opt_out_request", note: "لغو اشتراک از طریق پاسخ «توقف»", addedBy: "سیستم (خودکار)", addedAt: "۱۴۰۴/۰۶/۳۰", source: "automatic" },
    { id: "sup-8", name: "بازرگانی تیرگان", phone: "09177778899", reason: "manual_list", note: "لیست عدم ارسال دستی", addedBy: "مهدی راسا", addedAt: "۱۴۰۴/۰۶/۲۸", source: "manual" },
  ];
}

/* ---------- Smart Segments ---------- */
function buildSegments(): Segment[] {
  return [
    {
      id: "seg-1", name: "فروشندگان مبلمان در تهران", color: "bg-teal-500",
      rules: [
        { id: "r1", field: "category", operator: "is", value: "مبلمان" },
        { id: "r2", field: "city", operator: "is", value: "تهران" },
        { id: "r3", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 3240, createdAt: "۱۴۰۴/۰۷/۰۸",
    },
    {
      id: "seg-2", name: "فروشندگان مبلمان", color: "bg-amber-500",
      rules: [
        { id: "r1", field: "category", operator: "is", value: "مبلمان" },
        { id: "r2", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 4185, createdAt: "۱۴۰۴/۰۷/۰۹",
    },
    {
      id: "seg-3", name: "مشتریان تهران", color: "bg-sky-500",
      rules: [
        { id: "r1", field: "city", operator: "is", value: "تهران" },
        { id: "r2", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 15230, isSystem: true, createdAt: "۱۴۰۴/۰۶/۱۰",
    },
    {
      id: "seg-4", name: "سرنخ‌های نمایشگاه", color: "bg-violet-500",
      rules: [
        { id: "r1", field: "source", operator: "is", value: "نمایشگاه" },
        { id: "r2", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 6110, createdAt: "۱۴۰۴/۰۷/۰۱",
    },
    {
      id: "seg-5", name: "مخاطبان پاسخ‌داده", color: "bg-emerald-500",
      rules: [
        { id: "r1", field: "replied", operator: "is", value: "پاسخ داده" },
      ],
      matchCount: 8960, createdAt: "۱۴۰۴/۰۷/۰۶",
    },
    {
      id: "seg-6", name: "مخاطبان بدون پاسخ", color: "bg-rose-500",
      rules: [
        { id: "r1", field: "replied", operator: "is", value: "پاسخ نداده" },
        { id: "r2", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 21440, createdAt: "۱۴۰۴/۰۷/۰۶",
    },
    {
      id: "seg-7", name: "مشتریان قدیمی", color: "bg-emerald-600",
      rules: [
        { id: "r1", field: "tag", operator: "is", value: "مشتری فعلی" },
        { id: "r2", field: "consent", operator: "is", value: "مجاز" },
      ],
      matchCount: 9870, createdAt: "۱۴۰۴/۰۶/۱۵",
    },
  ];
}

/* ---------- Message Templates ---------- */
function buildTemplates(): MessageTemplate[] {
  return [
    { id: "tpl-1", name: "معرفی راساوب برای کسب‌وکارها", category: "intro", uses: 342, lastUsed: "امروز", body: "سلام {{نام}} 👋\nما تیم راساوب هستیم؛ برای کسب‌وکارهایی مثل {{نام کسب‌وکار}} در زمینه طراحی سایت و سئو فعال هستیم.\nاگر مایل باشید، نمونه‌کارهای صنف {{صنف}} را برایتان می‌فرستم.\nکارشناس شما: {{نام کارشناس}}" },
    { id: "tpl-2", name: "پیشنهاد تخفیف فصلی", category: "sales", uses: 528, lastUsed: "امروز", body: "سلام {{نام}} 🎁\nبه مناسبت فصل جدید، {{نام کسب‌وکار}} شامل تخفیف ویژه {{صنف}} شد:\n✅ ۳۰٪ تخفیف طراحی سایت\n✅ مشاوره رایگان\nتا پایان هفته اعتبار دارد — همین حالا پاسخ دهید." },
    { id: "tpl-3", name: "پیگیری سرنخ (۲۴ ساعت بعد)", category: "followup", uses: 214, lastUsed: "دیروز", body: "سلام {{نام}}،\nچند روز پیش درباره خدمات راساوب برای {{نام کسب‌وکار}} پیام دادیم.\nاگر هنوز فرصت بررسی نداشته‌اید، کافیست «اطلاعات» را ارسال کنید تا جزئیات را بفرستم 🙏" },
    { id: "tpl-4", name: "دعوت به وبینار", category: "invite", uses: 187, lastUsed: "۳ روز پیش", body: "سلام {{نام}} 🌟\nوبینار رایگان «راه‌های افزایش فروش آنلاین برای صنف {{صنف}}» برگزار می‌کنیم.\nجای شما رزرو شد؟ فقط «ثبت‌نام» را پاسخ دهید." },
    { id: "tpl-5", name: "تبریک تولد کسب‌وکار", category: "congrats", uses: 96, lastUsed: "۵ روز پیش", body: "سلام {{نام}} 🎂\nسالگرد تأسیس {{نام کسب‌وکار}} مبارک!\nبه‌عنوان هدیه، کد تخفیف RASA-BDAY تا یک هفته برای شما فعال است." },
    { id: "tpl-6", name: "اطلاع‌رسانی تغییر ساعت کاری", category: "announce", uses: 143, lastUsed: "۱ هفته پیش", body: "سلام {{نام}}،\nساعت پاسخ‌گویی پشتیبانی راساوب تغییر کرد:\n🕘 شنبه تا پنجشنبه ۸ تا ۱۸\nبا سپاس از همراهی شما." },
    { id: "tpl-7", name: "پیگیری فالوآپ نهایی", category: "followup", uses: 165, lastUsed: "۲ روز پیش", body: "سلام {{نام}}،\nاین آخرین پیام ما درباره پیشنهاد {{نام کسب‌وکار}} است. اگر فعلاً اولویت ندارید، پیام نمی‌دهیم 🌿\nهر زمان نیاز داشتید در خدمتیم — {{نام کارشناس}}" },
  ];
}

/* ---------- Projects ---------- */
function buildProjects(): Project[] {
  return [
    { id: "prj-rasa", name: "RasaWeb", color: "bg-teal-600", accounts: 1247, contacts: 58420, activeCampaigns: 3, messagesToday: 8420, issues: 2 },
    { id: "prj-a", name: "مشتری A", color: "bg-emerald-600", accounts: 42, contacts: 12540, activeCampaigns: 3, messagesToday: 640, issues: 2 },
    { id: "prj-b", name: "مشتری B", color: "bg-sky-600", accounts: 18, contacts: 5210, activeCampaigns: 1, messagesToday: 210, issues: 0 },
    { id: "prj-c", name: "مشتری C", color: "bg-violet-600", accounts: 9, contacts: 1870, activeCampaigns: 0, messagesToday: 0, issues: 1 },
  ];
}

/* ---------- Campaign Journey (cmp-1) ---------- */
function buildJourney(campaigns: Campaign[]): CampaignJourney {
  return {
    campaignId: "cmp-1",
    campaignName: campaigns[0]?.name ?? "پیشنهاد ویژه مهر",
    enabled: true,
    nodes: [
      { id: "jn-start", type: "action", title: "شروع کمپین", subtitle: "پس از تأیید و رسیدن بازه ارسال", x: 50, y: 3 },
      { id: "jn-msg1", type: "message", title: "مرحله ۱ — پیام معرفی", subtitle: "۳۲٬۰۸۸ مخاطب مجاز", body: "سلام {{نام}} 👋 برای کسب‌وکار {{نام کسب‌وکار}} پیشنهاد ویژه مهر فعال شد...", x: 50, y: 14 },
      { id: "jn-c1", type: "condition", title: "پاسخ داد؟", subtitle: "پایش صندوق ورودی تا ۴۸ ساعت", x: 50, y: 31 },
      { id: "jn-inbox", type: "action", title: "انتقال به Inbox", subtitle: "اختصاص به اپراتور", x: 16, y: 45 },
      { id: "jn-wait", type: "condition", title: "۲ روز بدون پاسخ", subtitle: "انتظار قبل از Follow-up", x: 84, y: 45 },
      { id: "jn-msg2", type: "message", title: "مرحله ۲ — Follow-up", subtitle: "۱۴٬۲۱۰ مخاطب", body: "سلام {{نام}}، چند روز پیش درباره پیشنهاد راساوب پیام دادیم؛ اگر فرصت بررسی داشتید...", x: 84, y: 56 },
      { id: "jn-c2", type: "condition", title: "باز هم پاسخ نداد؟", x: 84, y: 70 },
      { id: "jn-msg3", type: "message", title: "مرحله ۳ — پیام پایانی", subtitle: "۹٬۸۴۰ مخاطب", body: "سلام {{نام}}، این آخرین پیام ماست؛ هر زمان نیاز داشتید در خدمتیم 🌿", x: 50, y: 80 },
    ],
    edges: [
      { from: "jn-start", to: "jn-msg1", label: "", tone: "neutral" },
      { from: "jn-msg1", to: "jn-c1", label: "ارسال شد", tone: "neutral" },
      { from: "jn-c1", to: "jn-inbox", label: "اگر پاسخ داد", tone: "positive" },
      { from: "jn-c1", to: "jn-wait", label: "اگر پاسخ نداد", tone: "negative" },
      { from: "jn-wait", to: "jn-msg2", label: "", tone: "neutral" },
      { from: "jn-msg2", to: "jn-c2", label: "ارسال شد", tone: "neutral" },
      { from: "jn-c2", to: "jn-msg3", label: "اگر پاسخ نداد", tone: "negative" },
    ],
    triggers: [
      { id: "trg-1", event: "message_received", actions: ["stop_followup", "move_to_inbox", "assign_operator"], enabled: true },
      { id: "trg-2", event: "no_reply", condition: "۴۸ ساعت پس از ارسال", actions: ["send_notification"], enabled: true },
      { id: "trg-3", event: "send_error", condition: "کلاس Restriction", actions: ["pause_campaign", "send_notification"], enabled: true },
      { id: "trg-4", event: "campaign_completed", actions: ["send_notification"], enabled: true },
    ],
  };
}

/* ---------- Account Events ---------- */
function buildAccountEvents(): AccountEvent[] {
  return [
    { id: "ae-1", accountId: "bale-۰۱۲", type: "status_change", title: "اکانت محدود شد", detail: "محدودیت ارسال از طرف سرویس مقصد — ۸۴ پیام باقی‌مانده به صف منتقل شد", time: "11:35", date: "امروز" },
    { id: "ae-2", accountId: "bale-۰۱۲", type: "limit", title: "سقف روزانه به ۲۰ پیام رسید", detail: "ارسال امروز ۲۰/۲۰ — صف فعلی: ۲۲ پیام", time: "10:02", date: "امروز" },
    { id: "ae-3", accountId: "bale-۰۱۲", type: "info", title: "۱۰۴ پیام موفق امروز", detail: "نرخ موفقیت ۹۸٪ در بازه ۰۸:۰۰ تا ۱۰:۰۰", time: "10:00", date: "امروز" },
    { id: "ae-4", accountId: "rubika-۰۲۱", type: "resume", title: "اکانت دوباره فعال شد", detail: "پس از تأیید سیگنال سرویس مقصد، ۸۴ پیام از صف ادامه یافت", time: "13:10", date: "امروز" },
    { id: "ae-5", accountId: "rubika-۰۲۱", type: "status_change", title: "اکانت محدود شد", detail: "محدودیت موقت ارسال — توقف خودکار", time: "11:10", date: "امروز" },
    { id: "ae-6", accountId: "whatsapp-۰۰۴", type: "error", title: "خطای اتصال", detail: "سه تلاش متوالی ناموفق — نشست منقضی شده؛ نیازمند ورود مجدد (QR)", time: "11:20", date: "امروز" },
    { id: "ae-7", accountId: "telegram-۰۰۸", type: "reconnect", title: "احراز هویت مجدد با موفقیت انجام شد", detail: "کد تأیید پیامک تایید شد", time: "09:28", date: "امروز" },
    { id: "ae-8", accountId: "telegram-۰۰۸", type: "resume", title: "اکانت دوباره فعال شد", detail: "بازگشت به چرخه ارسال استخر تلگرام", time: "09:30", date: "امروز" },
    { id: "ae-9", accountId: "bale-۰۱۲", type: "status_change", title: "اکانت متصل شد", detail: "اتصال اولیه و ورود موفق", time: "07:44", date: "دیروز" },
  ];
}

/* ---------- Audit Log ---------- */
function buildAudit(): AuditEntry[] {
  return [
    { id: "a-1", user: "امیر کریمی", role: "مدیر کمپین", action: "کمپین «معرفی پکیج سئو زمستان» را برای تأیید ارسال کرد", object: "کمپین معرفی پکیج سئو زمستان", objectType: "campaign", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۱۰", time: "10:24" },
    { id: "a-2", user: "سارا محمدی", role: "مدیر کل", action: "متن کمپین را ویرایش کرد (شخصی‌سازی متغیر {{نام کسب‌وکار}})", object: "کمپین پیشنهاد ویژه مهر", objectType: "campaign", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۱۰", time: "09:58" },
    { id: "a-3", user: "سیستم", role: "اتوماسیون", action: "۸۴ پیام به صف منتقل شد (اکانت محدود: بله 012)", object: "بله 012", objectType: "queue", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۱۰", time: "12:05" },
    { id: "a-4", user: "سارا محمدی", role: "مدیر کل", action: "اکانت بله 012 را «محدود» علامت‌گذاری و ارسال آن را متوقف کرد", object: "بله 012", objectType: "account", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۱۰", time: "11:36" },
    { id: "a-5", user: "مریم رضایی", role: "اپراتور", action: "سگمنت «مخاطبان پاسخ‌داده» را ایجاد کرد", object: "سگمنت مخاطبان پاسخ‌داده", objectType: "segment", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۹", time: "15:41" },
    { id: "a-6", user: "امیر کریمی", role: "مدیر کمپین", action: "قالب «پیگیری سرنخ (۲۴ ساعت بعد)» را ذخیره کرد", object: "قالب پیگیری سرنخ", objectType: "template", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۹", time: "14:02" },
    { id: "a-7", user: "مهدی راسا", role: "مالک", action: "سقف روزانه پلتفرم بله را از ۱۵ به ۲۰ افزایش داد", object: "قوانین ارسال بله", objectType: "settings", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۸", time: "17:20" },
    { id: "a-8", user: "سارا محمدی", role: "مدیر کل", action: "کمپین «معرفی خدمات طراحی سایت مهر» را تأیید کرد", object: "کمپین معرفی خدمات طراحی سایت", objectType: "campaign", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۷", time: "11:05" },
    { id: "a-9", user: "سیستم", role: "اتوماسیون", action: "۱۲٬۵۸۰ مخاطب با موفقیت وارد شد (۱۲٬۱۱۰ معتبر / ۳۵۰ تکراری / ۱۲۰ نامعتبر)", object: "ورود گروهی مخاطبان", objectType: "contact", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۸", time: "09:10" },
    { id: "a-10", user: "حسین نوری", role: "اپراتور", action: "گفتگوی «علی رضایی — واتساپ» را به خود اختصاص داد", object: "گفتگوی علی رضایی", objectType: "contact", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۱۰", time: "13:06" },
    { id: "a-11", user: "مهدی راسا", role: "مالک", action: "پروژه «مشتری B» را ایجاد کرد", object: "پروژه مشتری B", objectType: "project", projectName: "مشتری B", date: "۱۴۰۴/۰۷/۰۵", time: "08:30" },
    { id: "a-12", user: "سیستم", role: "اتوماسیون", action: "۴۱۲ مخاطب بر اساس لیست عدم ارسال و وضعیت رضایت از کمپین حذف شد", object: "کمپین پیشنهاد ویژه مهر", objectType: "campaign", projectName: "RasaWeb", date: "۱۴۰۴/۰۷/۰۸", time: "07:55" },
  ];
}

/* ---------- Usage & Cost ---------- */
function buildUsage(): UsageRow[] {
  return [
    { platform: "whatsapp", sent: 1980, success: 1922, failed: 58, costPerMessage: 0 },
    { platform: "telegram", sent: 2410, success: 2354, failed: 56, costPerMessage: 0 },
    { platform: "rubika", sent: 1650, success: 1592, failed: 58, costPerMessage: 120 },
    { platform: "bale", sent: 1340, success: 1298, failed: 42, costPerMessage: 120 },
    { platform: "eitaa", sent: 690, success: 664, failed: 26, costPerMessage: 100 },
    { platform: "soroush", sent: 350, success: 336, failed: 14, costPerMessage: 100 },
  ];
}

/* ---------- Singleton export ---------- */
export const accounts = buildAccounts();
export const contacts = buildContacts();
export const campaigns = buildCampaigns();
export const queueItems = buildQueue(accounts, campaigns);
export const activityEvents = buildActivity();
export const notifications = buildNotifications();
export const systemUsers = buildUsers();
export const platformRules = buildRules();
export const pools = buildPools();
export const contactGroups = buildGroups();
export const conversations = buildConversations();
export const suppressionList = buildSuppression();
export const segments = buildSegments();
export const messageTemplates = buildTemplates();
export const projects = buildProjects();
export const campaignJourney = buildJourney(campaigns);
export const accountEvents = buildAccountEvents();
export const auditEntries = buildAudit();
export const usageRows = buildUsage();

export const TOTALS = {
  accounts: accounts.length,
  activeAccounts: accounts.filter((a) => a.status === "active").length,
  reviewAccounts:
    accounts.filter((a) => a.status !== "active" && a.status !== "inactive").length,
  contacts: contacts.length,
  sentToday: 8420,
  capacityToday: 12000,
  queuedToday: queueItems.filter((q) => q.status === "queued" || q.status === "paused").length,
};
