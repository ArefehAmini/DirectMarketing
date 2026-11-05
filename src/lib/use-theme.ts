"use client";
import { useCallback, useEffect, useState } from "react";
import {
  applyTheme, getSavedTheme, resolveTheme, THEMES, ThemeChoice, ThemeId,
} from "./themes";

/* هوک تم — مقدار انتخابی کاربر + تم واقعی حل‌شده.
   تغییر تم از هر جای برنامه (تاپ‌بار/تنظیمات) همهٔ نمونه‌ها را همگام می‌کند. */
export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(getSavedTheme());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as ThemeChoice | undefined;
      if (detail) setChoice(detail);
    };
    window.addEventListener("rw-theme-change", onChange);
    /* تغییر ترجیح OS در حالت سیستمی باید فوراً اعمال شود */
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onSys = () => {
      if (getSavedTheme() === "system") {
        const r = resolveTheme("system");
        document.documentElement.dataset.theme = r.theme;
        document.documentElement.classList.toggle("dark", r.dark);
      }
    };
    mq?.addEventListener?.("change", onSys);
    return () => {
      window.removeEventListener("rw-theme-change", onChange);
      mq?.removeEventListener?.("change", onSys);
    };
  }, []);

  const set = useCallback((c: ThemeChoice) => {
    applyTheme(c);
    setChoice(c);
  }, []);

  const resolved: { theme: ThemeId; dark: boolean } = resolveTheme(choice);

  return { choice, set, resolved, themes: THEMES };
}
