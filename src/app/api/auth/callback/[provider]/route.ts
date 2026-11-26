import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession, type Session } from "@/lib/auth";
import { findMember } from "@/lib/access";
import { ensureSchema, sql } from "@/lib/db";
import { OAUTH_COOKIE, exchangeCode, fetchUser, isProvider, providerEnabled } from "@/lib/oauth";

/**
 * Balik dari Google/Discord: cek state, tukar code jadi token, ambil profil, buat sesi.
 * Semua yang berhasil login dapat sesi; yang belum terdaftar akan melihat halaman akses eksklusif.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/callback/[provider]">) {
  const { provider } = await ctx.params;
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;

  const fail = (error: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${error}`, origin));
    res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/callback" });
    return res;
  };

  if (!isProvider(provider) || !providerEnabled(provider)) return fail("provider");
  if (params.get("error")) return fail("cancelled");

  let saved: { provider?: string; state?: string; verifier?: string } = {};
  try {
    saved = JSON.parse(req.cookies.get(OAUTH_COOKIE)?.value ?? "{}");
  } catch {
    /* cookie rusak → dianggap tidak ada */
  }
  const code = params.get("code");
  if (!code || !saved.state || saved.provider !== provider || saved.state !== params.get("state") || !saved.verifier) {
    return fail("state");
  }

  const token = await exchangeCode(provider, origin, code, saved.verifier);
  if (!token) return fail("token");
  const user = await fetchUser(provider, token);
  if (!user) return fail("token");

  const session: Session = {
    sub: `${user.provider}:${user.id}`,
    name: user.name,
    avatar: user.avatar,
    provider: user.provider,
    email: user.emailVerified ? user.email : null,
  };

  // catat login (semua orang, untuk daftar "Permintaan akses") + update info member. Gagal pun tidak masalah.
  try {
    await ensureSchema();
    await sql()`
      INSERT INTO accounts (sub, provider, name, email, discord_id, avatar)
      VALUES (${session.sub}, ${user.provider}, ${user.name}, ${session.email},
              ${user.provider === "discord" ? user.id : null}, ${user.avatar})
      ON CONFLICT (sub) DO UPDATE SET
        name = EXCLUDED.name, email = EXCLUDED.email, avatar = EXCLUDED.avatar,
        last_login_at = now(), login_count = accounts.login_count + 1`;
    const member = await findMember(session);
    if (member) {
      await sql()`
        UPDATE members SET last_login_at = now(), account_name = ${user.name}, avatar = ${user.avatar}
        WHERE id = ${member.id}`;
    }
  } catch (e) {
    console.error("[oauth] gagal update member", e);
  }

  let jwt: string;
  try {
    jwt = await signSession(session);
  } catch {
    return fail("config");
  }

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/callback" });
  res.cookies.set(SESSION_COOKIE, jwt, sessionCookieOptions);
  return res;
}
