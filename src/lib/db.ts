import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

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

/** Tandai map berubah, supaya game tahu ada versi baru. */
export async function touchMap(mapId: number) {
  await sql()`UPDATE maps SET updated_at = now() WHERE id = ${mapId}`;
}

export async function getMapBySlug(slug: string): Promise<(MapRow & { key_hash: string }) | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT * FROM maps WHERE slug = ${slug} LIMIT 1`) as (MapRow & { key_hash: string })[];
  return rows[0] ?? null;
}
