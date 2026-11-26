import { createHash, randomBytes } from "node:crypto";

/**
 * Login dengan Google / Discord (OAuth 2 + PKCE), tanpa library tambahan.
 * Siapa yang boleh masuk ditentukan oleh allowlist di env:
 *   ALLOWED_EMAILS       = email Google/Discord (terverifikasi), pisahkan dengan koma
 *   ALLOWED_DISCORD_IDS  = ID user Discord, pisahkan dengan koma
 * Redirect URI yang harus didaftarkan: <origin>/api/auth/callback/<google|discord>
 */
export const PROVIDERS = ["google", "discord"] as const;
export type ProviderId = (typeof PROVIDERS)[number];

export const OAUTH_COOKIE = "onblox_oauth";

type ProviderConfig = {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  extraParams: Record<string, string>;
  clientId?: string;
  clientSecret?: string;
};

function config(id: ProviderId): ProviderConfig {
  if (id === "google") {
    return {
      label: "Google",
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scope: "openid email profile",
      extraParams: { prompt: "select_account" },
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    label: "Discord",
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scope: "identify email",
    extraParams: { prompt: "none" },
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
  };
}

export function isProvider(id: string): id is ProviderId {
  return (PROVIDERS as readonly string[]).includes(id);
}

export function providerEnabled(id: ProviderId) {
  const c = config(id);
  return Boolean(c.clientId && c.clientSecret);
}

export function enabledProviders() {
  return PROVIDERS.filter(providerEnabled).map((id) => ({ id, label: config(id).label }));
}

export function callbackUrl(origin: string, id: ProviderId) {
  return `${origin}/api/auth/callback/${id}`;
}

export function newPkce() {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function authorizeUrl(id: ProviderId, origin: string, state: string, challenge: string) {
  const c = config(id);
  const url = new URL(c.authorizeUrl);
  url.search = new URLSearchParams({
    client_id: c.clientId ?? "",
    redirect_uri: callbackUrl(origin, id),
    response_type: "code",
    scope: c.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...c.extraParams,
  }).toString();
  return url.toString();
}

export async function exchangeCode(id: ProviderId, origin: string, code: string, verifier: string) {
  const c = config(id);
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      client_id: c.clientId ?? "",
      client_secret: c.clientSecret ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(origin, id),
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    // detail error tampil di Vercel → Logs (mis. invalid_client = secret salah)
    console.error(`[oauth:${id}] token gagal`, res.status, data.error ?? data);
    return null;
  }
  return data.access_token;
}

export type OAuthUser = {
  provider: ProviderId;
  id: string;
  email: string | null;
  emailVerified: boolean;
  name: string;
  avatar: string | null;
};

export async function fetchUser(id: ProviderId, accessToken: string): Promise<OAuthUser | null> {
  const headers = { authorization: `Bearer ${accessToken}` };
  if (id === "google") {
    const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers, cache: "no-store" });
    if (!res.ok) return null;
    const u = (await res.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    return {
      provider: "google",
      id: u.sub,
      email: u.email?.toLowerCase() ?? null,
      emailVerified: u.email_verified === true,
      name: u.name || u.email || "Google user",
      avatar: u.picture ?? null,
    };
  }
  const res = await fetch("https://discord.com/api/users/@me", { headers, cache: "no-store" });
  if (!res.ok) return null;
  const u = (await res.json()) as {
    id: string;
    username: string;
    global_name?: string | null;
    email?: string | null;
    verified?: boolean;
    avatar?: string | null;
  };
  return {
    provider: "discord",
    id: u.id,
    email: u.email?.toLowerCase() ?? null,
    emailVerified: u.verified === true,
    name: u.global_name || u.username,
    avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : null,
  };
}

function list(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function allowlistConfigured() {
  return list("ALLOWED_EMAILS").length > 0 || list("ALLOWED_DISCORD_IDS").length > 0;
}

/** Hanya akun di allowlist yang boleh masuk. Email harus sudah terverifikasi di provider-nya. */
export function isAllowed(user: OAuthUser) {
  if (user.provider === "discord" && list("ALLOWED_DISCORD_IDS").includes(user.id)) return true;
  return Boolean(user.email && user.emailVerified && list("ALLOWED_EMAILS").includes(user.email));
}
