import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE, SESSION_TTL_MS, createSession, hashPassword,
  isValidEmail, passwordProblem, resolveRoleForNewUser,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length < 3)
      return Response.json({ error: "نام و نام خانوادگی باید حداقل ۳ کاراکتر باشد." }, { status: 400 });
    if (typeof email !== "string" || !isValidEmail(email))
      return Response.json({ error: "ایمیل واردشده معتبر نیست." }, { status: 400 });
    const pwProblem = passwordProblem(String(password ?? ""));
    if (pwProblem) return Response.json({ error: pwProblem }, { status: 400 });

    const mail = email.trim().toLowerCase();
    const existing = await db.appUser.findUnique({ where: { email: mail } });
    if (existing)
      return Response.json({ error: "با این ایمیل قبلاً حساب ساخته شده است. وارد شوید." }, { status: 409 });

    const role = await resolveRoleForNewUser();
    const user = await db.appUser.create({
      data: { email: mail, name: name.trim(), passwordHash: hashPassword(String(password)), role },
    });

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
    console.error("register error", e);
    return Response.json({ error: "خطای غیرمنتظره در سرور. دوباره تلاش کنید." }, { status: 500 });
  }
}
