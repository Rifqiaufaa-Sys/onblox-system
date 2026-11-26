import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Login versi 1: satu password admin (ADMIN_PASSWORD) + sesi JWT di cookie.
 * Nanti bisa diganti / ditambah "Login with Roblox" (OAuth) tanpa mengubah API dance.
 */
export const SESSION_COOKIE = "onblox_session";
const SESSION_DAYS = 14;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET belum di-set (minimal 16 karakter).");
  }
  return new TextEncoder().encode(s);
}

export type Session = { sub: string; role: "admin" };

export async function createSession(name: string) {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(name)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "admin" || !payload.sub) return null;
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}

export function checkAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Kunci API per map. Yang disimpan hanya hash-nya; kunci asli cuma ditampilkan sekali. */
export function newApiKey() {
  const key = "obx_" + randomBytes(24).toString("base64url");
  return { key, hash: hashKey(key), hint: key.slice(0, 8) + "…" + key.slice(-4) };
}

export function hashKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

export function keyMatches(key: string, hash: string) {
  const a = Buffer.from(hashKey(key), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Helper untuk route handler admin. */
export async function requireAdmin(): Promise<Session | Response> {
  const s = await getSession();
  if (!s) return Response.json({ error: "Belum login" }, { status: 401 });
  return s;
}
