import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Sesi login = JWT di cookie httpOnly.
 * Cara masuk: Google / Discord (lihat src/lib/oauth.ts, dibatasi allowlist) atau
 * password cadangan ADMIN_PASSWORD (opsional; kosongkan untuk mematikan).
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

export type Provider = "google" | "discord" | "password";

/**
 * Identitas orang yang login. Hak aksesnya (owner/admin/klien/tidak ada) TIDAK disimpan di sini,
 * tapi dihitung ulang tiap request di src/lib/access.ts, supaya mencabut akses langsung berlaku.
 */
export type Session = {
  /** mis. "google:<sub>", "discord:<id>", "password:admin" */
  sub: string;
  name: string;
  avatar: string | null;
  provider: Provider;
  /** hanya diisi kalau email sudah terverifikasi di Google/Discord */
  email: string | null;
};

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

export async function signSession(s: Session) {
  return new SignJWT({ kind: "onblox", name: s.name, avatar: s.avatar, provider: s.provider, email: s.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(s.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function createSession(s: Session) {
  const token = await signSession(s);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions);
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
    if (!payload.sub) return null;
    const str = (v: unknown) => (typeof v === "string" && v ? v : null);
    return {
      sub: payload.sub,
      name: str(payload.name) ?? "User",
      avatar: str(payload.avatar),
      provider: (str(payload.provider) as Provider | null) ?? "password",
      email: str(payload.email),
    };
  } catch {
    return null;
  }
}

export function passwordLoginEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
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
