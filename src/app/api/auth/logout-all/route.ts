import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth";

/* خروج از همه دستگاه‌ها: همه نشست‌های کاربر حذف می‌شود */
export async function POST() {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
  if (!user) return Response.json({ error: "unauthenticated" }, { status: 401 });
  await db.session.deleteMany({ where: { userId: user.id } });
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
