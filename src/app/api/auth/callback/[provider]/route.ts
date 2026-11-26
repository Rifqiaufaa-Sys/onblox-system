import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { OAUTH_COOKIE, exchangeCode, fetchUser, isAllowed, isProvider, providerEnabled } from "@/lib/oauth";

/** Balik dari Google/Discord: cek state, tukar code jadi token, ambil profil, cek allowlist, buat sesi. */
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

  if (!isAllowed(user)) {
    console.warn(`[oauth:${provider}] ditolak (tidak ada di allowlist)`, user.id, user.email);
    return fail("denied");
  }

  let session: string;
  try {
    session = await signSession({
      sub: `${user.provider}:${user.id}`,
      name: user.name,
      avatar: user.avatar,
      provider: user.provider,
    });
  } catch {
    return fail("config");
  }

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.delete({ name: OAUTH_COOKIE, path: "/api/auth/callback" });
  res.cookies.set(SESSION_COOKIE, session, sessionCookieOptions);
  return res;
}
