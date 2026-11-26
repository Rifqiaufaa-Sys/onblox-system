import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, authorizeUrl, isProvider, newPkce, providerEnabled } from "@/lib/oauth";

/** Mulai login: simpan state + PKCE verifier di cookie sementara, lalu lempar ke Google/Discord. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/auth/signin/[provider]">) {
  const { provider } = await ctx.params;
  const origin = req.nextUrl.origin;
  if (!isProvider(provider) || !providerEnabled(provider)) {
    return NextResponse.redirect(new URL("/login?error=provider", origin));
  }

  const { state, verifier, challenge } = newPkce();
  const res = NextResponse.redirect(authorizeUrl(provider, origin, state, challenge));
  res.cookies.set(OAUTH_COOKIE, JSON.stringify({ provider, state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/callback",
    maxAge: 10 * 60,
  });
  return res;
}
