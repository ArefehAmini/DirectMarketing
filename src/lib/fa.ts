/* ─── Persian formatting helpers ─── */

const faNumFormatter = new Intl.NumberFormat("fa-IR");
const faDecimalFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 });

/** Convert any number to Persian digits with separators: 1247 → ۱٬۲۴۷ */
export function faNum(n: number | string): string {
  if (n == null) return "۰";
  if (typeof n === "string") {
    /* برای رشته‌ها (شماره تلفن، ساعت و…) فقط ارقام فارسی می‌گذاریم */
    return n.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]);
  }
  if (Number.isNaN(n)) return "۰";
  return faNumFormatter.format(Math.round(n * 100) / 100 === Math.round(n) ? Math.round(n) : n);
}

export function faDecimal(n: number): string {
  return faDecimalFormatter.format(n);
}

/** 92 → ۹۲٪ */
export function faPercent(n: number): string {
  return `${faNum(n)}٪`;
}

/** Jalali date string like «۱۴۰۴/۰۷/۱۰» */
export function faDate(d: Date): string {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Long Jalali date like «۱۰ مهر ۱۴۰۴» */
export function faDateLong(d: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** HH:mm in Persian digits */
export function faTime(d: Date): string {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

/** Minutes ago → «۵ دقیقه پیش» */
export function faMinutesAgo(minutes: number): string {
  if (minutes < 1) return "همین لحظه";
  if (minutes < 60) return `${faNum(minutes)} دقیقه پیش`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${faNum(h)} ساعت پیش`;
  const days = Math.floor(h / 24);
  return `${faNum(days)} روز پیش`;
}

/** Mask phone: 09121234567 → ۰۹••••••۶۷ */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 2) + "•".repeat(6) + phone.slice(-2);
}

/** Health color class */
export function healthColor(h: number): string {
  if (h >= 85) return "text-emerald-600";
  if (h >= 70) return "text-amber-600";
  return "text-red-600";
}

export function healthBarColor(h: number): string {
  if (h >= 85) return "bg-emerald-500";
  if (h >= 70) return "bg-amber-500";
  return "bg-red-500";
}

const PERSIAN_FIRST = ["علی", "محمد", "زهرا", "فاطمه", "رضا", "حسین", "مریم", "سارا", "امیر", "نرگس", "مهدی", "شیما", "پویا", "الهام", "کاظم", "لیلا", "سعید", "هانیه", "بهرام", "نازنین", "کامران", "پریسا", "یاسر", "مینا", "آرش", "سمانه", "فرهاد", "نگار", "بهنام", "رؤیا"];
const PERSIAN_LAST = ["رضایی", "محمدی", "حسینی", "احمدی", "کریمی", "موسوی", "نوری", "صادقی", "جعفری", "قاسمی", "شریفی", "تهرانی", "اصفهانی", "شیرازی", "تبریزی", "فراهانی", "کاشانی", "یزدی", "همدانی", "مشار", "بهرامی", "سلطانی", "اکبری", "زمانی", "نظری"];

export function randomName(rand: () => number): string {
  const f = PERSIAN_FIRST[Math.floor(rand() * PERSIAN_FIRST.length)];
  const l = PERSIAN_LAST[Math.floor(rand() * PERSIAN_LAST.length)];
  return `${f} ${l}`;
}

/** Deterministic PRNG */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
