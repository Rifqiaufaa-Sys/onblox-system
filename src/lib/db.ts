import { neon, neonConfig, type NeonQueryFunction } from "@neondatabase/serverless";

// Hanya untuk tes lokal (server tiruan Neon). Di Vercel env ini tidak ada.
if (process.env.NEON_FETCH_ENDPOINT) neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

/**
 * Database: Postgres di Neon (gratis, bisa disambungkan langsung dari dashboard Vercel).
 * Tabel dibuat otomatis saat pertama kali dipakai, jadi tidak perlu menjalankan migrasi manual.
 */
let client: NeonQueryFunction<false, false> | null = null;

export function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum di-set. Sambungkan Neon Postgres di Vercel → Storage.");
  }
  client ??= neon(url);
  return client;
}

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const db = sql();
    await db`
      CREATE TABLE IF NOT EXISTS maps (
        id          SERIAL PRIMARY KEY,
        slug        TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        place_id    BIGINT,
        key_hash    TEXT NOT NULL,
        key_hint    TEXT NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE TABLE IF NOT EXISTS dances (
        id            SERIAL PRIMARY KEY,
        map_id        INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        animation_id  BIGINT NOT NULL,
        name          TEXT NOT NULL,
        category      TEXT NOT NULL DEFAULT 'Dance',
        creator       TEXT,
        added_by      TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (map_id, animation_id)
      )`;
    await db`CREATE INDEX IF NOT EXISTS dances_map_idx ON dances(map_id)`;
    // member = orang yang boleh masuk selain owner (owner diatur lewat env ALLOWED_*)
    await db`
      CREATE TABLE IF NOT EXISTS members (
        id             SERIAL PRIMARY KEY,
        name           TEXT NOT NULL,
        email          TEXT UNIQUE,
        discord_id     TEXT UNIQUE,
        role           TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('admin', 'client')),
        account_name   TEXT,
        avatar         TEXT,
        last_login_at  TIMESTAMPTZ,
        created_by     TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    await db`
      CREATE TABLE IF NOT EXISTS map_access (
        member_id  INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        map_id     INTEGER NOT NULL REFERENCES maps(id) ON DELETE CASCADE,
        PRIMARY KEY (member_id, map_id)
      )`;
  })().catch((err) => {
    ready = null; // coba lagi di request berikutnya
    throw err;
  });
  return ready;
}

export type MapRow = {
  id: number;
  slug: string;
  name: string;
  place_id: string | null;
  key_hint: string;
  created_at: string;
  updated_at: string;
  dance_count?: number;
};

export type DanceRow = {
  id: number;
  map_id: number;
  animation_id: string;
  name: string;
  category: string;
  creator: string | null;
  added_by: string | null;
  created_at: string;
};

export type MemberRole = "admin" | "client";

export type MemberRow = {
  id: number;
  name: string;
  email: string | null;
  discord_id: string | null;
  role: MemberRole;
  account_name: string | null;
  avatar: string | null;
  last_login_at: string | null;
  created_at: string;
  map_ids?: number[];
};

/** Tandai map berubah, supaya game tahu ada versi baru. */
export async function touchMap(mapId: number) {
  await sql()`UPDATE maps SET updated_at = now() WHERE id = ${mapId}`;
}

export async function getMapBySlug(slug: string): Promise<(MapRow & { key_hash: string }) | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM maps WHERE slug = ${slug} LIMIT 1`) as (MapRow & { key_hash: string })[];
  return rows[0] ?? null;
}
