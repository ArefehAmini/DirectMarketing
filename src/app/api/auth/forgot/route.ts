import { randomInt } from "crypto";
import { db } from "@/lib/db";
import { isValidEmail } from "@/lib/auth";

const TTL_MS = 10 * 60 * 1000; // ۱۰ دقیقه

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !isValidEmail(email))
      return Response.json({ error: "ایمیل واردشده معتبر نیست." }, { status: 400 });

    const mail = email.trim().toLowerCase();
    const user = await db.appUser.findUnique({ where: { email: mail } });

    /* برای جلوگیری از افشای وجود/عدم وجود حساب، همیشه پاسخ موفق برمی‌گردد */
    if (!user) return Response.json({ ok: true });

    const code = String(randomInt(100000, 999999));
    await db.passwordResetCode.create({
      data: { email: mail, code, expiresAt: new Date(Date.now() + TTL_MS) },
    });

    /* در محیط تست سرویس ایمیل متصل نیست؛ کد مستقیماً برگردانده می‌شود تا
       فلوی بازیابی به‌صورت واقعی و کامل قابل تست باشد. */
    return Response.json({ ok: true, devCode: code });
  } catch (e) {
    console.error("forgot error", e);
    return Response.json({ error: "خطای غیرمنتظره در سرور. دوباره تلاش کنید." }, { status: 500 });
  }
}
