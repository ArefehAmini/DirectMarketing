"use client";
import { Platform } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlatformIcon } from "./platform-icon";
import { Eye, CheckCheck, Clock3, Info } from "lucide-react";

function shortTime(): string {
  return new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

/** پیش‌نمایش تقریبی پیام روی UI پیام‌رسان انتخاب‌شده — کاملاً مشخص است که فقط Preview است */
export function MessagePreview({ platform, message, contactName = "علی رضایی" }: { platform: Platform; message: string; contactName?: string }) {
  const time = shortTime();

  const headers: Record<Platform, { bg: string; title: string; sub: string; accent: string; bubble: string }> = {
    whatsapp: { bg: "bg-[#075e54]", title: contactName, sub: "آنلاین", accent: "bg-[#dcf8c6]", bubble: "text-slate-800" },
    telegram: { bg: "bg-[#2aabee]", title: contactName, sub: "آخرین بازدید به‌تازگی", accent: "bg-[#effdde]", bubble: "text-slate-800" },
    rubika: { bg: "bg-[#7c3aed]", title: contactName, sub: "فعال", accent: "bg-violet-50", bubble: "text-slate-800" },
    bale: { bg: "bg-[#16a34a]", title: contactName, sub: "آنلاین", accent: "bg-emerald-50", bubble: "text-slate-800" },
    eitaa: { bg: "bg-[#f59e0b]", title: contactName, sub: "آنلاین", accent: "bg-amber-50", bubble: "text-slate-800" },
    soroush: { bg: "bg-[#0ea5e9]", title: contactName, sub: "آنلاین", accent: "bg-sky-50", bubble: "text-slate-800" },
  };

  const h = headers[platform];

  return (
    <div className="relative">
      <div className="rounded-2xl border bg-muted/40 overflow-hidden shadow-sm max-w-[320px] mx-auto" dir="rtl">
        {/* Header */}
        <div className={cn("flex items-center gap-2.5 px-3.5 py-3 text-white", h.bg)}>
          <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
            {contactName.slice(0, 2)}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">{h.title}</div>
            <div className="text-[9px] opacity-80">{h.sub}</div>
          </div>
        </div>
        {/* Chat body */}
        <div className="px-3 py-4 min-h-40 bg-chat-bg" style={{ backgroundColor: "oklch(0.96 0.004 190)" }}>
          <div className={cn("rounded-xl rounded-tr-sm px-3 py-2.5 max-w-[85%] ml-auto shadow-sm", h.accent, h.bubble)}>
            <p className="text-[11px] leading-5 whitespace-pre-wrap break-words">
              {message || "متن پیام شما اینجا نمایش داده می‌شود…"}
            </p>
            <div className="flex items-center justify-end gap-1 mt-1.5 text-[8px] text-slate-500">
              <span className="tabular-nums">{time}</span>
              <CheckCheck className="w-3 h-3 text-sky-600" />
            </div>
          </div>
        </div>
        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t bg-background">
          <div className="flex-1 h-7 rounded-full bg-muted" />
          <div className={cn("w-7 h-7 rounded-full flex items-center justify-center", h.bg)}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-white rotate-180">
              <path d="M2 21 23 12 2 3l4 7 11 2-11 2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Explicit preview label */}
      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground bg-muted/60 rounded-full px-3 py-1.5 w-fit mx-auto">
        <Eye className="w-3 h-3" />
        پیش‌نمایش تقریبی است و UI دقیق سرویس مقصد نیست
      </div>
    </div>
  );
}

export function PreviewTabSwitch({ platforms, active, onChange }: { platforms: Platform[]; active: Platform; onChange: (p: Platform) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap mb-4">
      {platforms.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer",
            active === p ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-950/40" : "bg-card hover:border-teal-300 text-muted-foreground"
          )}
        >
          <PlatformIcon platform={p} size={18} className="rounded-md" />
          پیام‌رسان
        </button>
      ))}
    </div>
  );
}
