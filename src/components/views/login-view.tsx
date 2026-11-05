"use client";
import { useState } from "react";
import { useApp } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AnimatedCounter } from "@/components/shared/ui-bits";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, ShieldCheck, Sparkles, BarChart3, Smartphone, Loader2, KeyRound, CheckCircle2, AlertCircle, User, X } from "lucide-react";
import { faNum } from "@/lib/fa";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

export function LoginView() {
  const { loginEmail, registerEmail, pending2FA, twofaCode, verify2FA, cancel2FA } = useApp();
  const [mode, setMode] = useState<Mode>("login");

  /* 2FA step */
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  /* login */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* register */
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [regPass2, setRegPass2] = useState("");
  const [regShow, setRegShow] = useState(false);
  const [regTerms, setRegTerms] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");

  /* forgot password — سه مرحله: ایمیل → کد → گذرواژه جدید */
  const [fpOpen, setFpOpen] = useState(false);
  const [fpStep, setFpStep] = useState<1 | 2 | 3>(1);
  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpDevCode, setFpDevCode] = useState("");
  const [fpPass, setFpPass] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpDone, setFpDone] = useState(false);
  const { requestReset, resetPassword } = useApp();

  const strength = (pw: string) => {
    let sc = 0;
    if (pw.length >= 8) sc++;
    if (pw.length >= 12) sc++;
    if (/[0-9]/.test(pw) && /[A-Za-z]/.test(pw)) sc++;
    if (/[^A-Za-z0-9]/.test(pw)) sc++;
    return sc; // 0..4
  };
  const strengthMeta = [
    { label: "خیلی ضعیف", cls: "bg-red-500", w: "w-1/4" },
    { label: "ضعیف", cls: "bg-orange-500", w: "w-2/4" },
    { label: "متوسط", cls: "bg-amber-500", w: "w-3/4" },
    { label: "قوی", cls: "bg-emerald-500", w: "w-full" },
  ];

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || password.length === 0) {
      setError("ایمیل و گذرواژه را وارد کنید.");
      return;
    }
    setError("");
    setLoading(true);
    const res = await loginEmail(email.trim(), password);
    setLoading(false);
    if (!res.ok) setError(res.error ?? "ورود ناموفق بود.");
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regName.trim().length < 3) return setRegError("نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد.");
    if (!regEmail.includes("@")) return setRegError("یک ایمیل معتبر وارد کنید.");
    if (regPass.length < 8 || !/[0-9]/.test(regPass)) return setRegError("گذرواژه باید حداقل ۸ کاراکتر و شامل رقم باشد.");
    if (regPass !== regPass2) return setRegError("تکرار گذرواژه مطابقت ندارد.");
    if (!regTerms) return setRegError("پذیرش قوانین استفاده الزامی است.");
    setRegError("");
    setRegLoading(true);
    const res = await registerEmail(regName.trim(), regEmail.trim(), regPass);
    setRegLoading(false);
    if (!res.ok) setRegError(res.error ?? "ثبت‌نام ناموفق بود.");
  };

  /* ── بازیابی گذرواژه ── */
  const submitForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpEmail.includes("@")) return setFpError("یک ایمیل معتبر وارد کنید.");
    setFpError("");
    setFpLoading(true);
    const res = await requestReset(fpEmail.trim());
    setFpLoading(false);
    if (!res.ok) return setFpError(res.error ?? "ارسال کد ناموفق بود.");
    setFpDevCode(res.devCode ?? "");
    setFpStep(2);
  };

  const submitForgotCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fpCode.trim().length !== 6) return setFpError("کد ۶ رقمی را وارد کنید.");
    setFpError("");
    setFpStep(3);
  };

  const submitForgotNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fpPass.length < 8 || !/[0-9]/.test(fpPass)) return setFpError("گذرواژه باید حداقل ۸ کاراکتر و شامل رقم باشد.");
    setFpError("");
    setFpLoading(true);
    const res = await resetPassword(fpEmail.trim(), fpCode.trim(), fpPass);
    setFpLoading(false);
    if (!res.ok) return setFpError(res.error ?? "بازیابی ناموفق بود.");
    setFpDone(true);
  };

  const resetFp = () => {
    setFpOpen(false);
    setTimeout(() => {
      setFpStep(1);
      setFpCode("");
      setFpDevCode("");
      setFpPass("");
      setFpError("");
      setFpDone(false);
    }, 300);
  };

  /* ── مرحله دوم ورود: کد 2FA ── */
  if (pending2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">RW</div>
            <div>
              <div className="font-bold">RasaWeb</div>
              <div className="text-[11px] text-muted-foreground">Messaging Hub</div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-6">
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-3">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
            </div>
            <h2 className="text-xl font-bold">تأیید دو مرحله‌ای</h2>
            <p className="text-sm text-muted-foreground mt-1.5 leading-6">
              گذرواژه تأیید شد. کد یک‌بارمصرف ۶ رقمی را وارد کنید تا ورود کامل شود.
            </p>
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] leading-5 text-amber-800 mt-4">
              در این محیط سرویس پیامک متصل نیست؛ کد برای تست نمایش داده می‌شود:
              <span dir="ltr" className="font-bold tracking-[0.3em] text-amber-900 mr-2">{twofaCode ?? "——"}</span>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!verify2FA(otp)) setOtpError("کد واردشده صحیح نیست.");
              }}
              className="mt-5 space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="otp">کد یک‌بارمصرف</Label>
                <Input
                  id="otp"
                  dir="ltr"
                  className="text-left tracking-[0.4em] font-bold h-11"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setOtpError("");
                  }}
                  placeholder="______"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                />
                {otpError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {otpError}
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold">
                تأیید و ورود به پنل
              </Button>
              <button
                type="button"
                onClick={() => {
                  cancel2FA();
                  setOtp("");
                  setOtpError("");
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                بازگشت و ورود با حساب دیگر
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background" dir="rtl">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[46%] relative overflow-hidden bg-sidebar text-sidebar-foreground p-10">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-500/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center font-bold shadow-lg">
              RW
            </div>
            <div>
              <div className="font-bold text-lg text-white">RasaWeb</div>
              <div className="text-xs text-sidebar-foreground/60">Messaging Hub</div>
            </div>
          </div>
        </div>

        <div className="relative space-y-8">
          <h1 className="text-3xl font-bold leading-relaxed text-white">
            مدیریت متمرکز همه اکانت‌ها،
            <br />
            مخاطبان و کمپین‌های پیام‌رسانی
            <br />
            <span className="text-teal-300">در یک پنل واحد.</span>
          </h1>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { label: "کانال پیام‌رسان", value: 6, icon: Smartphone },
              { label: "حالت‌های رابط کاربری", value: 9, icon: BarChart3 },
              { label: "دستیار هوشمند", value: 3, icon: Sparkles },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 backdrop-blur-sm">
                <s.icon className="w-5 h-5 text-teal-300 mb-2" />
                <div className="text-xl font-bold text-white">
                  <AnimatedCounter value={s.value} />
                </div>
                <div className="text-[11px] text-sidebar-foreground/60 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-xs text-sidebar-foreground/50">
          <ShieldCheck className="w-4 h-4" />
          اتصال رمزنگاری‌شده · احراز هویت دو مرحله‌ای · لاگ کامل رخدادها
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">RW</div>
            <div>
              <div className="font-bold">RasaWeb</div>
              <div className="text-[11px] text-muted-foreground">Messaging Hub</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-secondary border mb-6">
            {(
              [
                { key: "login", label: "ورود" },
                { key: "register", label: "ساخت حساب" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setMode(t.key);
                  setError("");
                  setRegError("");
                }}
                className={cn(
                  "h-9 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                  mode === t.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === "login" ? (
            <>
              <h2 className="text-2xl font-bold text-foreground">ورود به پنل مدیریت</h2>
              <p className="text-sm text-muted-foreground mt-2">
                با حساب سازمانی خود وارد شوید. حساب ندارید؟{" "}
                <button onClick={() => setMode("register")} className="text-teal-600 font-semibold hover:underline cursor-pointer">
                  بسازید
                </button>
                .
              </p>

              <form onSubmit={submitLogin} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل سازمانی</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      className="pr-9 text-left"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.ir"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pass">گذرواژه</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setFpOpen(true);
                        setFpEmail(email);
                      }}
                      className="text-xs text-teal-600 hover:underline cursor-pointer"
                    >
                      فراموشی گذرواژه؟
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="pass"
                      type={show ? "text" : "password"}
                      dir="ltr"
                      className="pr-9 pl-9 text-left"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="نمایش گذرواژه"
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox id="remember" defaultChecked />
                  <Label htmlFor="remember" className="text-xs font-normal text-muted-foreground">
                    مرا به خاطر بسپار (دستگاه مورد اعتماد)
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال ورود…
                    </>
                  ) : (
                    <>
                      ورود به پنل
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">ساخت حساب کاربری</h2>
              <p className="text-sm text-muted-foreground mt-2">
                فضای کاری اختصاصی خود را بسازید؛ داده‌های شما جدا و ماندگار ذخیره می‌شود.
              </p>

              <form onSubmit={submitRegister} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reg-name">نام و نام خانوادگی</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-name"
                      className="pr-9"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="مثلاً سارا محمدی"
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">ایمیل سازمانی</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-email"
                      type="email"
                      dir="ltr"
                      className="pr-9 text-left"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@company.ir"
                      autoComplete="email"
                      inputMode="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-pass">گذرواژه</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-pass"
                      type={regShow ? "text" : "password"}
                      dir="ltr"
                      className="pr-9 pl-9 text-left"
                      value={regPass}
                      onChange={(e) => setRegPass(e.target.value)}
                      placeholder="حداقل ۸ کاراکتر، شامل رقم"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setRegShow((s) => !s)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label="نمایش گذرواژه"
                    >
                      {regShow ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {regPass.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={cn("h-full transition-all duration-300", strengthMeta[Math.min(strength(regPass), 3)].cls, strengthMeta[Math.min(strength(regPass), 3)].w)} />
                      </div>
                      <span className="text-[10px] text-muted-foreground w-14">{strengthMeta[Math.min(strength(regPass), 3)].label}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-pass2">تکرار گذرواژه</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-pass2"
                      type="password"
                      dir="ltr"
                      className="pr-9 text-left"
                      value={regPass2}
                      onChange={(e) => setRegPass2(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                  {regPass2.length > 0 && regPass === regPass2 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5" /> مطابقت دارد
                    </div>
                  )}
                </div>

                {regError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {regError}
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox id="terms" checked={regTerms} onCheckedChange={(v) => setRegTerms(v === true)} className="mt-0.5" />
                  <Label htmlFor="terms" className="text-xs font-normal text-muted-foreground leading-5">
                    <span className="font-semibold text-foreground">قوانین استفاده</span> را می‌پذیرم؛ ارسال پیام فقط از طریق روش‌های رسمی و مجاز هر سرویس و با رضایت مخاطب انجام می‌شود.
                  </Label>
                </div>

                <Button
                  type="submit"
                  disabled={regLoading}
                  className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2"
                >
                  {regLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال ساخت حساب…
                    </>
                  ) : (
                    <>
                      ساخت حساب و ورود
                      <ArrowLeft className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          )}

          <p className="text-center text-[11px] text-muted-foreground mt-8">
            {faNum(1404)} © RasaWeb Messaging Hub — تمام حقوق محفوظ است
          </p>
        </div>
      </div>

      {/* Forgot password — سه مرحله واقعی */}
      <Dialog open={fpOpen} onOpenChange={(o) => (o ? setFpOpen(true) : resetFp())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-2">
              <KeyRound className="w-5 h-5 text-teal-600" />
            </div>
            <DialogTitle>
              {fpStep === 1 && "بازیابی گذرواژه"}
              {fpStep === 2 && "وارد کردن کد بازیابی"}
              {fpStep === 3 && "تعیین گذرواژه جدید"}
              {fpDone && "گذرواژه تغییر کرد"}
            </DialogTitle>
            <DialogDescription>
              {fpStep === 1 && "ایمیل سازمانی خود را وارد کنید تا کد بازیابی ۶ رقمی صادر شود."}
              {fpStep === 2 && `کد ۶ رقمی ارسال‌شده برای ${fpEmail} را وارد کنید. کد تا ۱۰ دقیقه اعتبار دارد.`}
              {fpStep === 3 && "گذرواژه جدید انتخاب کنید. پس از تغییر، همه نشست‌های فعال شما خارج می‌شوند."}
              {fpDone && "حالا می‌توانید با گذرواژه جدید وارد شوید."}
            </DialogDescription>
          </DialogHeader>

          {fpDone ? (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm leading-6 text-emerald-800">
                  گذرواژه حساب <span dir="ltr" className="font-semibold">{fpEmail}</span> با موفقیت تغییر کرد و از همه دستگاه‌ها خارج شدید.
                </div>
              </div>
              <Button onClick={resetFp} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                بازگشت به صفحه ورود
              </Button>
            </div>
          ) : fpStep === 1 ? (
            <form onSubmit={submitForgotEmail} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="fp-email">ایمیل سازمانی</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fp-email"
                    type="email"
                    dir="ltr"
                    className="pr-9 text-left"
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
                    placeholder="you@company.ir"
                    autoComplete="email"
                  />
                </div>
                {fpError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fpError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetFp} className="flex-1">
                  انصراف
                </Button>
                <Button type="submit" disabled={fpLoading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  {fpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> در حال صدور کد…
                    </>
                  ) : (
                    "صدور کد بازیابی"
                  )}
                </Button>
              </div>
            </form>
          ) : fpStep === 2 ? (
            <form onSubmit={submitForgotCode} className="space-y-4 pt-1">
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-[11px] leading-5 text-amber-800 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                در این محیط سرویس ایمیل متصل نیست؛ کد برای تست مستقیماً نمایش داده می‌شود:
                <span dir="ltr" className="font-bold tracking-[0.3em] text-amber-900">{fpDevCode || "—"}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fp-code">کد بازیابی ۶ رقمی</Label>
                <Input
                  id="fp-code"
                  dir="ltr"
                  className="text-left tracking-[0.4em] font-bold"
                  value={fpCode}
                  onChange={(e) => setFpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="______"
                  inputMode="numeric"
                  maxLength={6}
                />
                {fpError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fpError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setFpStep(1)} className="flex-1">
                  مرحله قبل
                </Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                  بررسی کد
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={submitForgotNew} className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label htmlFor="fp-pass">گذرواژه جدید</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="fp-pass"
                    type="password"
                    dir="ltr"
                    className="pr-9 text-left"
                    value={fpPass}
                    onChange={(e) => setFpPass(e.target.value)}
                    placeholder="حداقل ۸ کاراکتر، شامل رقم"
                    autoComplete="new-password"
                  />
                </div>
                {fpError && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fpError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setFpStep(2)} className="flex-1">
                  مرحله قبل
                </Button>
                <Button type="submit" disabled={fpLoading} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white gap-2">
                  {fpLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> در حال ثبت…
                    </>
                  ) : (
                    "ثبت گذرواژه جدید"
                  )}
                </Button>
              </div>
            </form>
          )}
          {!fpDone && (
            <button onClick={resetFp} className="absolute left-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer" aria-label="بستن">
              <X className="w-4 h-4" />
            </button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
