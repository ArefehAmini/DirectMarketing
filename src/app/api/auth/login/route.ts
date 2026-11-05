import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, isValidEmail, verifyPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (typeof email !== "string" || !isValidEmail(email))
      return Response.json({ error: "ایمیل واردشده معتبر نیست." }, { status: 400 });
    if (typeof password !== "string" || password.length === 0)
      return Response.json({ error: "گذرواژه را وارد کنید." }, { status: 400 });

    const user = await db.appUser.findUnique({ where: { email: email.trim().toLowerCase() } });

    /* پیام یکسان برای ایمیل ناموجود / گذرواژه غلط — رفتار استاندارد امنیتی */
    if (!user || !verifyPassword(String(password), user.passwordHash))
      return Response.json({ error: "ایمیل یا گذرواژه اشتباه است." }, { status: 401 });

    const token = await createSession(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    });

    return Response.json({ id: user.id, email: user.email, name: user.name, roleKey: user.role });
  } catch (e) {
    console.error("login error", e);
    return Response.json({ error: "خطای غیرمنتظره در سرور. دوباره تلاش کنید." }, { status: 500 });
  }
}
