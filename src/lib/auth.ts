import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "rw_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // ۷ روز

/* ── هش گذرواژه با scrypt (بدون وابستگی خارجی) ── */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const orig = Buffer.from(hash, "hex");
  return orig.length === test.length && timingSafeEqual(orig, test);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function passwordProblem(password: string): string | null {
  if (password.length < 8) return "گذرواژه باید حداقل ۸ کاراکتر باشد.";
  if (!/[A-Za-zآ-ی]/.test(password)) return "گذرواژه باید حداقل یک حرف داشته باشد.";
  if (!/[0-9]/.test(password)) return "گذرواژه باید حداقل یک رقم داشته باشد.";
  return null;
}

/* ── نشست‌ها ── */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function getSessionUser(token: string | undefined) {
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { token } }).catch(() => {});
}

/* نقش کاربر اول مالک است، بقیه مدیر کل — برای تست واقعی RBAC */
export async function resolveRoleForNewUser(): Promise<string> {
  const count = await db.appUser.count();
  return count === 0 ? "owner" : "admin";
}

export const ROLE_LABEL: Record<string, string> = {
  owner: "مالک",
  admin: "مدیر کل",
  campaign_manager: "مدیر کمپین",
  operator: "اپراتور",
  viewer: "مشاهده‌گر",
  custom: "نقش سفارشی",
};
