/* ═══════ سیستم تم رنگی RasaWeb ═══════
   ۸ تم تولیدی + حالت سیستمی — منطبق بر سند «Current Production Theme Palettes»
   هر تم، مجموعهٔ کامل توکن‌های shadcn (vars) را override می‌کند؛
   تم‌های تیره کلاس .dark را روشن می‌کنند تا variant های dark: کامپوننت‌ها هم‌خوان بمانند. */

export type ThemeId =
  | "continental"
  | "graphite"
  | "midnight_indigo"
  | "daylight"
  | "saramad_rose"
  | "lavande"
  | "sakura"
  | "forest";

export type ThemeChoice = ThemeId | "system";

export interface ThemePalette {
  id: ThemeId;
  name: string;
  hint: string;
  dark: boolean;
  /* نمونهٔ رنگ برای سواچ انتخابگر */
  swatch: { bg: string; card: string; accent: string; text: string };
}

export const THEMES: ThemePalette[] = [
  {
    id: "continental", name: "کانتیننتال", hint: "گردویی تیره با طلایی کلاسیک", dark: true,
    swatch: { bg: "#1D1410", card: "#2A1D16", accent: "#D4AF37", text: "#F5E9D9" },
  },
  {
    id: "graphite", name: "گرافیت", hint: "تیرهٔ خنثی با لهجهٔ طلایی", dark: true,
    swatch: { bg: "#0F1117", card: "#1A1D27", accent: "#DAA520", text: "#F1F5F9" },
  },
  {
    id: "midnight_indigo", name: "نیلی نیمه‌شب", hint: "بنفش سیر اشباع روی سرمه‌ای", dark: true,
    swatch: { bg: "#0E0D1A", card: "#181631", accent: "#7B6CFF", text: "#E8E6FA" },
  },
  {
    id: "daylight", name: "دی‌لایت", hint: "روشنِ گرم با طلایی محتاط", dark: false,
    swatch: { bg: "#F8F6F1", card: "#FFFFFF", accent: "#B8860B", text: "#1F2937" },
  },
  {
    id: "saramad_rose", name: "سرامد رز", hint: "عاج گرم با رزگلد ملایم", dark: false,
    swatch: { bg: "#FDF6F2", card: "#FFFFFF", accent: "#C46B6B", text: "#4A2C2C" },
  },
  {
    id: "lavande", name: "لاوند", hint: "کرم و یاسی روشن", dark: false,
    swatch: { bg: "#F8F5FB", card: "#FFFFFF", accent: "#8B6FC4", text: "#2E2440" },
  },
  {
    id: "sakura", name: "ساکورا", hint: "سفید و صورتی لطیف", dark: false,
    swatch: { bg: "#FFF3F6", card: "#FFFFFF", accent: "#E85A8A", text: "#4A1F33" },
  },
  {
    id: "forest", name: "فارست", hint: "سبز جنگلی روی کاغذی", dark: false,
    swatch: { bg: "#F5F2E9", card: "#FDFAF2", accent: "#357A4A", text: "#1F3326" },
  },
];

export const THEME_STORAGE_KEY = "rw-theme";

/* ترتیب انتخابگر طبق سند تولید */
export const PICKER_ORDER: ThemeChoice[] = [
  "system", "continental", "graphite", "midnight_indigo",
  "daylight", "saramad_rose", "lavande", "sakura", "forest",
];

const DARK_THEMES: ThemeId[] = ["continental", "graphite", "midnight_indigo"];

export function isThemeId(v: string | null | undefined): v is ThemeId {
  return !!v && THEMES.some((t) => t.id === v);
}

export function getSavedTheme(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(THEME_STORAGE_KEY);
  return v === "system" || isThemeId(v) ? v : "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/* تم انتخابی کاربر → تم واقعی + حالت تیره/روشن
   «سیستمی» طبق سند: Graphite در ترجیح تیره OS، Daylight در غیر آن */
export function resolveTheme(choice: ThemeChoice): { theme: ThemeId; dark: boolean } {
  if (choice === "system") {
    const dark = systemPrefersDark();
    return { theme: dark ? "graphite" : "daylight", dark };
  }
  return { theme: choice, dark: DARK_THEMES.includes(choice) };
}

export function applyTheme(choice: ThemeChoice): { theme: ThemeId; dark: boolean } {
  if (typeof document === "undefined") return { theme: "daylight", dark: false };
  const resolved = resolveTheme(choice);
  const el = document.documentElement;
  el.dataset.theme = resolved.theme;
  el.classList.toggle("dark", resolved.dark);
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch { /* حالت ناشناس */ }
  /* اطلاع به شنونده‌ها (هوک useTheme و ...) */
  window.dispatchEvent(new CustomEvent("rw-theme-change", { detail: choice }));
  return resolved;
}
