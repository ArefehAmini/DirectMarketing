import { cookies } from "next/headers";
import { SESSION_COOKIE, destroySession } from "@/lib/auth";

export async function POST() {
  const jar = await cookies();
  await destroySession(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
