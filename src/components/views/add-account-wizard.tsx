"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/store/app-store";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PageHeader } from "@/components/shared/ui-bits";
import { PLATFORMS, PLATFORM_LABEL, PLATFORM_AUTH, Platform } from "@/lib/types";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/shared/ui-bits";
import {
  ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2, MessageSquareLock,
  QrCode, ShieldCheck, Smartphone, Info, Lock, Phone,
} from "lucide-react";

type Step = 1 | 2 | 3;
type ConnectStage = "input" | "code_sent" | "twofa" | "verifying" | "success";

const AUTH_LABEL = {
  phone_code: "احراز هویت با شماره و کد",
  qr: "اتصال با QR Code",
  api_token: "اتصال با API Token",
  bot_token: "اتصال با Bot Token",
  oauth: "احراز هویت OAuth",
};

export function AddAccountWizard() {
  const { navigate, addAccount } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [twoFa, setTwoFa] = useState("");
  const [needs2fa, setNeeds2fa] = useState(false);
  const [stage, setStage] = useState<ConnectStage>("input");
  const [otp, setOtp] = useState("");
  const [accName, setAccName] = useState("");
  const [sentCode, setSentCode] = useState("");
  const [hasTwoFa, setHasTwoFa] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const reset = () => {
    setStep(1);
    setPlatform(null);
    setPhone("");
    setToken("");
    setOtp("");
    setTwoFa("");
    setNeeds2fa(false);
    setStage("input");
    setAccName("");
  };

  const pickPlatform = (p: Platform) => {
    setPlatform(p);
    setAccName(`${PLATFORM_LABEL[p]} ${faNum(1248)}`);
    setStep(2);
  };

  const sendCode = () => {
    if (!/^09\d{9}$/.test(phone)) return toast.error("شماره موبایل معتبر نیست (۰۹xxxxxxxxx)");
    const code = String(Math.floor(10000 + Math.random() * 90000));
    setSentCode(code);
    setStage("code_sent");
    toast.success("کد تأیید ارسال شد", { description: `پیامک سرویس ${PLATFORM_LABEL[platform!]} به شماره واردشده ارسال شد` });
  };

  const confirmOtp = () => {
    if (otp.length < 5) return toast.error("کد ۵ رقمی را کامل وارد کنید");
    if (otp !== sentCode) return toast.error("کد واردشده با کد ارسال‌شده مطابقت ندارد");
    if (hasTwoFa && !needs2fa) {
      setNeeds2fa(true);
      setStage("twofa");
      return;
    }
    verify();
  };

  const verifyToken = () => {
    if (token.trim().length < 8) return toast.error("توکن معتبر وارد کنید");
    verify();
  };

  const verify = () => {
    setStage("verifying");
    later(() => {
      setStage("success");
      if (platform) addAccount({ platform, name: accName, phone: phone || "—" });
      toast.success("اکانت با موفقیت متصل شد");
    }, 1800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader title="افزودن اکانت" subtitle="اتصال اکانت جدید با روش مجاز و پشتیبانی‌شده همان سرویس" />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: "انتخاب پلتفرم" },
          { n: 2, label: "اتصال و احراز هویت" },
          { n: 3, label: "تأیید و پایان" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1 last:flex-none">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold border transition-colors",
                step === s.n ? "bg-teal-600 text-white border-teal-600" : step > s.n ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:border-teal-900" : "bg-background text-muted-foreground"
              )}
            >
              <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px]", step === s.n ? "bg-white/20" : step > s.n ? "bg-teal-600 text-white" : "bg-muted")}>
                {step > s.n ? "✓" : faNum(s.n)}
              </span>
              {s.label}
            </div>
            {i < 2 && <div className={cn("h-px flex-1", step > s.n ? "bg-teal-300" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* Step 1: platform */}
      {step === 1 && (
        <div className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription className="text-xs leading-6">
              هر سرویس فقط با روش اتصال رسمی و پشتیبانی‌شده خودش متصل می‌شود. این سیستم از هر روشی (شماره+کد، QR، توکن، OAuth) پشتیبانی می‌کند و به یک روش خاص وابسته نیست.
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => pickPlatform(p)}
                className="group rounded-2xl border bg-card p-5 text-right transition-all hover:border-teal-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <PlatformIcon platform={p} size={44} className="rounded-xl mb-3 shadow-sm" />
                <div className="font-bold text-sm">{PLATFORM_LABEL[p]}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-5">
                  {AUTH_LABEL[PLATFORM_AUTH[p]]}
                </div>
              </button>
            ))}
            <button
              onClick={() => { toast.info("سایر پلتفرم‌ها به‌زودی"); }}
              className="group rounded-2xl border border-dashed p-5 text-right transition-colors hover:border-teal-400 hover:bg-muted/30 cursor-pointer"
            >
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="font-bold text-sm text-muted-foreground">سایر پلتفرم‌ها</div>
              <div className="text-[11px] text-muted-foreground/70 mt-1">به‌زودی در دسترس</div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: connect */}
      {step === 2 && platform && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b">
              <PlatformIcon platform={platform} size={40} className="rounded-xl" />
              <div>
                <div className="font-bold text-sm">اتصال اکانت {PLATFORM_LABEL[platform]}</div>
                <div className="text-xs text-muted-foreground">{AUTH_LABEL[PLATFORM_AUTH[platform]]}</div>
              </div>
              <Button variant="ghost" size="sm" className="mr-auto text-xs" onClick={() => { reset(); }}>
                تغییر پلتفرم
              </Button>
            </div>

            {/* Phone + Code flow */}
            {PLATFORM_AUTH[platform] === "phone_code" && (
              <div className="space-y-5 max-w-md">
                {stage === "input" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold">شماره تلفن اکانت</label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input dir="ltr" className="pr-9 text-left tabular-nums" placeholder="09xxxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHasTwoFa((v) => !v)}
                      className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-right cursor-pointer transition-colors hover:bg-muted/30"
                    >
                      <span className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors", hasTwoFa ? "bg-teal-600 border-teal-600 text-white" : "bg-background border-muted-foreground/40")}>
                        {hasTwoFa && <CheckCircle2 className="w-3 h-3" />}
                      </span>
                      <span className="text-xs">این اکانت رمز دوم (2FA) دارد</span>
                      <span className="text-[10px] text-muted-foreground">— اگر فعال است، پس از کد تأیید پرسیده می‌شود</span>
                    </button>
                    <Button onClick={sendCode} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                      ارسال کد تأیید <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </>
                )}

                {stage === "code_sent" && (
                  <>
                    <div className="text-sm">
                      کد ۵ رقمی ارسال‌شده به <b dir="ltr" className="tabular-nums">{phone}</b> را وارد کنید.
                      <button className="text-teal-600 text-xs mr-2 hover:underline cursor-pointer" onClick={() => setStage("input")}>تغییر شماره</button>
                    </div>
                    <InputOTP maxLength={5} value={otp} onChange={setOtp} dir="ltr">
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSeparator />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                      </InputOTPGroup>
                    </InputOTP>
                    <div className="flex items-center gap-2">
                      <Button onClick={confirmOtp} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                        تأیید کد <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3 max-w-md">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground mb-1.5">
                        <MessageSquareLock className="w-3.5 h-3.5" />
                        پیامک شبیه‌سازی‌شده سرویس — در محیط تست به‌جای ارسال واقعی نمایش داده می‌شود
                      </div>
                      <div className="text-xs leading-6">
                        <span className="font-bold">{PLATFORM_LABEL[platform]}</span>: کد تأیید شما <b dir="ltr" className="tabular-nums tracking-widest text-teal-700">{sentCode}</b> است. این کد را با کسی به اشتراک نگذارید.
                      </div>
                    </div>
                  </>
                )}

                {stage === "twofa" && (
                  <>
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
                      <Lock className="w-4 h-4" />
                      <AlertDescription className="text-xs leading-6">
                        این اکانت رمز دوم (2FA) دارد. رمز دوم سرویس {PLATFORM_LABEL[platform]} را وارد کنید. رمز به‌صورت امن ذخیره می‌شود و هرگز در UI نمایش داده نمی‌شود.
                      </AlertDescription>
                    </Alert>
                    <div className="relative max-w-xs">
                      <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="password" dir="ltr" className="pr-9 text-left" value={twoFa} onChange={(e) => setTwoFa(e.target.value)} placeholder="رمز دوم (2FA)" />
                    </div>
                    <Button onClick={verify} className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                      تأیید و اتصال <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* QR flow */}
            {PLATFORM_AUTH[platform] === "qr" && stage !== "verifying" && stage !== "success" && (
              <div className="flex flex-col sm:flex-row gap-8 items-center max-w-md">
                <div className="w-48 h-48 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50/50 dark:bg-teal-950/20 flex items-center justify-center relative">
                  <QrCode className="w-28 h-28 text-teal-600/70" />
                  <span className="absolute inset-4 border-2 border-teal-500 rounded-lg scan-line" />
                </div>
                <div className="space-y-3 text-sm">
                  <p className="font-semibold">با گوشی خود اسکن کنید</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 leading-5 list-decimal pr-4">
                    <li>اپلیکیشن {PLATFORM_LABEL[platform]} را باز کنید</li>
                    <li>به بخش Linked Devices بروید</li>
                    <li>گزینه Link a Device را انتخاب کنید</li>
                    <li>این کد را اسکن کنید</li>
                  </ol>
                  <Button onClick={() => setStage("verifying")} size="sm" variant="outline">
                    اسکن شد — ادامه
                  </Button>
                </div>
              </div>
            )}

            {/* Token flow (سایر روش‌ها) */}
            {PLATFORM_AUTH[platform] === "phone_code" && false && null}

            {(stage === "verifying" || stage === "success") && (
              <div className="py-10 flex flex-col items-center text-center max-w-sm mx-auto">
                {stage === "verifying" ? (
                  <>
                    <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-4" />
                    <p className="text-sm font-semibold">در حال تأیید اتصال با سرویس {PLATFORM_LABEL[platform]}…</p>
                    <p className="text-xs text-muted-foreground mt-1.5">این کار معمولاً چند ثانیه طول می‌کشد</p>
                    <div className="w-56 space-y-2.5 mt-6">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4 mx-auto" />
                      <Skeleton className="h-3 w-1/2 mx-auto" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="text-base font-bold">اکانت متصل شد!</p>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      «{accName}» اکنون فعال است و به استخر {PLATFORM_LABEL[platform]} اضافه شد.
                    </p>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step navigation / finish */}
      {step === 2 && stage === "success" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold">نام اکانت در سیستم</label>
              <Input value={accName} onChange={(e) => setAccName(e.target.value)} className="max-w-sm" />
              <p className="text-[11px] text-muted-foreground">از این نام در گزارش‌ها و صف ارسال استفاده می‌شود.</p>
            </div>
            <div className="flex gap-2">
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={() => {
                  toast.success(`«${accName}» ذخیره شد`);
                  navigate("accounts");
                }}
              >
                مشاهده اکانت‌ها
              </Button>
              <Button variant="outline" onClick={reset}>اتصال اکانت دیگر</Button>
              <Button variant="ghost" onClick={() => navigate("dashboard")}>بازگشت به داشبورد</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && stage !== "success" && (
        <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer">
          <ArrowRight className="w-3.5 h-3.5" /> بازگشت به انتخاب پلتفرم
        </button>
      )}
    </div>
  );
}
