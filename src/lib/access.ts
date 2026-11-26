import { cache } from "react";
import { cookies } from "next/headers";
import { getSession, type Session } from "./auth";
import { ensureSchema, getMapBySlug, sql, type AccountRow, type MemberRow } from "./db";

/**
 * Siapa boleh apa.
 *   owner  — dari env ALLOWED_EMAILS / ALLOWED_DISCORD_IDS (+ login password). Tidak bisa dikunci dari UI.
 *   admin  — member "Admin studio": semua map + kelola akses.
 *   client — member "Klien": hanya map yang dibagikan ke dia, hanya kelola dance.
 *   none   — login berhasil tapi belum terdaftar → halaman akses eksklusif.
 * Dihitung ulang tiap request (bukan disimpan di cookie), jadi cabut akses langsung berlaku.
 */
export type Role = "owner" | "admin" | "client" | "none";

export type Access = {
  session: Session;
  role: Role;
  memberId: number | null;
  mapIds: number[] | "all";
  /** diisi saat owner/admin sedang "Lihat sebagai" orang lain (hanya tampilan halaman) */
  preview: { label: string } | null;
};

/** Cookie mode pratinjau: "guest" atau "member:<id>". Hanya dihormati kalau aslinya owner/admin. */
export const PREVIEW_COOKIE = "onblox_preview";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin studio",
  client: "Klien",
  none: "Tamu",
};

function envList(name: string) {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function ownerConfigured() {
  return envList("ALLOWED_EMAILS").length > 0 || envList("ALLOWED_DISCORD_IDS").length > 0;
}

export function discordIdOf(s: Pick<Session, "sub">) {
  return s.sub.startsWith("discord:") ? s.sub.slice("discord:".length) : null;
}

function isOwner(s: Session) {
  if (s.provider === "password") return true;
  const discordId = discordIdOf(s);
  if (discordId && envList("ALLOWED_DISCORD_IDS").includes(discordId)) return true;
  return Boolean(s.email && envList("ALLOWED_EMAILS").includes(s.email));
}

/**
 * Orang yang sudah login tapi belum punya akses (bukan owner, belum jadi member, belum diabaikan).
 */
export async function pendingRequests(limit = 100): Promise<AccountRow[]> {
  await ensureSchema();
  const rows = (await sql()`
    SELECT a.* FROM accounts a
    WHERE NOT a.dismissed AND NOT EXISTS (
      SELECT 1 FROM members m
      WHERE (a.discord_id IS NOT NULL AND m.discord_id = a.discord_id)
         OR (a.email IS NOT NULL AND m.email = a.email))
    ORDER BY a.last_login_at DESC LIMIT ${limit}`) as AccountRow[];
  return rows.filter(
    (a) => !isOwner({ sub: a.sub, provider: a.provider as Session["provider"], email: a.email, name: a.name, avatar: null }),
  );
}

/** Cari member yang cocok dengan Discord ID atau email (terverifikasi) dari sesi. */
export async function findMember(s: Session): Promise<MemberRow | null> {
  const discordId = discordIdOf(s);
  if (!discordId && !s.email) return null;
  await ensureSchema();
  const rows = (await sql()`
    SELECT * FROM members
    WHERE (${discordId}::text IS NOT NULL AND discord_id = ${discordId})
       OR (${s.email}::text IS NOT NULL AND email = ${s.email})
    ORDER BY (discord_id = ${discordId}) DESC NULLS LAST
    LIMIT 1`) as MemberRow[];
  return rows[0] ?? null;
}

async function memberAccess(session: Session, m: MemberRow): Promise<Access> {
  if (m.role === "admin") return { session, role: "admin", memberId: m.id, mapIds: "all", preview: null };
  const rows = (await sql()`SELECT map_id FROM map_access WHERE member_id = ${m.id}`) as { map_id: number }[];
  return { session, role: "client", memberId: m.id, mapIds: rows.map((r) => r.map_id), preview: null };
}

/** Hak akses ASLI (dipakai semua API). Tidak terpengaruh mode pratinjau. */
export async function accessFor(session: Session): Promise<Access> {
  if (isOwner(session)) return { session, role: "owner", memberId: null, mapIds: "all", preview: null };
  const m = await findMember(session);
  if (!m) return { session, role: "none", memberId: null, mapIds: [], preview: null };
  return memberAccess(session, m);
}

/** Identitas contoh untuk pratinjau tamu (bukan akun sungguhan). */
const GUEST_PREVIEW: Session = {
  sub: "discord:123456789012345678",
  name: "Calon Klien",
  avatar: null,
  provider: "discord",
  email: null,
};

/**
 * Untuk server component (halaman). Di-cache per request supaya layout + page tidak query dua kali.
 * Owner/admin yang menyalakan pratinjau akan melihat halaman persis seperti klien/tamu itu.
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  const session = await getSession();
  if (!session) return null;
  const real = await accessFor(session);
  if (!isStaff(real)) return real;

  const p = (await cookies()).get(PREVIEW_COOKIE)?.value;
  if (p === "guest") {
    return { session: GUEST_PREVIEW, role: "none", memberId: null, mapIds: [], preview: { label: "Tamu (belum terdaftar)" } };
  }
  const id = p?.startsWith("member:") ? Number(p.slice(7)) : NaN;
  if (!Number.isInteger(id)) return real;
  const rows = (await sql()`SELECT * FROM members WHERE id = ${id}`) as MemberRow[];
  const m = rows[0];
  if (!m) return real;
  const as: Session = {
    sub: m.discord_id ? `discord:${m.discord_id}` : `preview:${m.id}`,
    name: m.name,
    avatar: m.avatar,
    provider: m.discord_id ? "discord" : "google",
    email: m.email,
  };
  const a = await memberAccess(as, m);
  return { ...a, preview: { label: `${m.name} · ${ROLE_LABEL[a.role]}` } };
});

export function isStaff(a: Access) {
  return a.role === "owner" || a.role === "admin";
}

export function canOpenMap(a: Access, mapId: number) {
  return a.mapIds === "all" || a.mapIds.includes(mapId);
}

// ---------- untuk route handler (/api/admin/*) ----------

async function apiAccess(): Promise<Access | Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Belum login" }, { status: 401 });
  try {
    const a = await accessFor(session);
    if (a.role === "none") return Response.json({ error: "Akun ini belum punya akses" }, { status: 403 });
    return a;
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
}

/** Siapa saja yang punya akses (owner/admin/klien). */
export async function requireMember() {
  return apiAccess();
}

/** Hanya owner & admin studio. */
export async function requireStaff(): Promise<Access | Response> {
  const a = await apiAccess();
  if (a instanceof Response) return a;
  if (!isStaff(a)) return Response.json({ error: "Hanya admin studio" }, { status: 403 });
  return a;
}

/** Map + akses ke map itu. Map yang tidak boleh dilihat dianggap tidak ada (404). */
export async function requireMap(slug: string) {
  const a = await apiAccess();
  if (a instanceof Response) return a;
  const map = await getMapBySlug(slug);
  if (!map || !canOpenMap(a, map.id)) return Response.json({ error: "Map tidak ditemukan" }, { status: 404 });
  return { access: a, map };
}
