import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, hashPassword, passwordProblem } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, code, password } = await req.json();
    const mail = typeof email === "string" ? email.trim().toLowerCase() : "";

    const record = await db.passwordResetCode.findFirst({
      where: { email: mail, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!record || record.code !== String(code ?? "").trim())
      return Response.json({ error: "کد بازیابی نامعتبر یا منقضی شده است." }, { status: 400 });

    const pwProblem = passwordProblem(String(password ?? ""));
    if (pwProblem) return Response.json({ error: pwProblem }, { status: 400 });

    const user = await db.appUser.findUnique({ where: { email: mail } });
    if (!user) return Response.json({ error: "کاربری با این ایمیل یافت نشد." }, { status: 404 });

    await db.$transaction([
      db.appUser.update({ where: { id: user.id }, data: { passwordHash: hashPassword(String(password)) } }),
      db.passwordResetCode.update({ where: { id: record.id }, data: { used: true } }),
      db.session.deleteMany({ where: { userId: user.id } }), // خروج از همه دستگاه‌ها
    ]);

    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("reset error", e);
    return Response.json({ error: "خطای غیرمنتظره در سرور. دوباره تلاش کنید." }, { status: 500 });
  }
}
