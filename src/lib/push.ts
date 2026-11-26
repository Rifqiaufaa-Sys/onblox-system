import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { after } from "next/server";
import { sql } from "./db";

/**
 * Sinyal instan ke semua server game yang sedang jalan, lewat Roblox Open Cloud MessagingService.
 * Script OnBloxDances berlangganan topik "OnBloxSystem"; pesan = slug map → server langsung mengambil daftar.
 * Butuh per map: Universe ID + Open Cloud API key (izin universe-messaging-service:publish).
 * Docs: https://create.roblox.com/docs/cloud/guides/usage-messaging
 */
export const PUSH_TOPIC = "OnBloxSystem";
export const PING_MESSAGE = "__onblox_ping__"; // diabaikan game (bukan slug)

// ---------- enkripsi API key (AES-256-GCM, kunci diturunkan dari CLOUD_KEY_SECRET / SESSION_SECRET) ----------

function encKey() {
  const secret = process.env.CLOUD_KEY_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET belum di-set");
  return createHash("sha256").update(`onblox-cloud-key:${secret}`).digest();
}

export function encryptSecret(plain: string) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", encKey(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(token: string): string | null {
  try {
    const [v, iv, tag, data] = token.split(".");
    if (v !== "v1") return null;
    const d = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null; // SESSION_SECRET berubah → key harus dimasukkan ulang
  }
}

export function keyHint(key: string) {
  return key.length > 10 ? `${key.slice(0, 4)}…${key.slice(-4)}` : "••••";
}

// ---------- kirim ----------

export type PublishResult = { ok: true } | { ok: false; error: string };

export async function publish(universeId: string, apiKey: string, message: string): Promise<PublishResult> {
  try {
    const res = await fetch(`https://apis.roblox.com/cloud/v2/universes/${universeId}:publishMessage`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ topic: PUSH_TOPIC, message }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { ok: true };
    const body = (await res.text()).slice(0, 300);
    const hint =
      res.status === 401 || res.status === 403
        ? "API key ditolak (cek izin universe-messaging-service:publish untuk game ini, dan IP yang diizinkan)"
        : res.status === 404
          ? "Universe ID tidak ditemukan"
          : res.status === 429
            ? "Terlalu banyak sinyal, coba lagi sebentar"
            : `Roblox membalas HTTP ${res.status}`;
    console.error("[push] gagal", res.status, body);
    return { ok: false, error: hint };
  } catch (e) {
    return { ok: false, error: `Tidak bisa menghubungi Roblox: ${(e as Error).message}` };
  }
}

type PushRow = { slug: string; universe_id: string | null; cloud_key_enc: string | null };

/** Kirim sinyal untuk satu map dan catat hasilnya. Diam saja kalau sinyal belum diatur. */
export async function pushMapNow(mapId: number, message?: string): Promise<PublishResult | null> {
  const [m] = (await sql()`SELECT slug, universe_id::text AS universe_id, cloud_key_enc FROM maps WHERE id = ${mapId}`) as PushRow[];
  if (!m?.universe_id || !m.cloud_key_enc) return null;
  const key = decryptSecret(m.cloud_key_enc);
  const result: PublishResult = key
    ? await publish(m.universe_id, key, message ?? m.slug)
    : { ok: false, error: "API key tidak bisa dibuka (SESSION_SECRET berubah?). Masukkan ulang key." };
  if (result.ok) {
    await sql()`UPDATE maps SET push_last_at = now(), push_last_error = NULL WHERE id = ${mapId}`;
  } else {
    await sql()`UPDATE maps SET push_last_error = ${result.error} WHERE id = ${mapId}`;
  }
  return result;
}

/** Dipanggil setelah daftar dance berubah: kirim sinyal SETELAH response terkirim (tidak memperlambat UI). */
export function notifyGame(mapId: number) {
  after(async () => {
    try {
      await pushMapNow(mapId);
    } catch (e) {
      console.error("[push] error", e);
    }
  });
}

/** Terima Place ID atau Universe ID; balas Universe ID. */
export async function toUniverseId(input: string): Promise<string | null> {
  const id = input.match(/\d{5,20}/)?.[0];
  if (!id) return null;
  try {
    const res = await fetch(`https://apis.roblox.com/universes/v1/places/${id}/universe`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = (await res.json()) as { universeId?: number | null };
      if (data.universeId) return String(data.universeId);
    }
  } catch {
    /* anggap sudah Universe ID */
  }
  return id;
}
