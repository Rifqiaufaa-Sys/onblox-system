import type { NextRequest } from "next/server";
import { keyMatches } from "@/lib/auth";
import { getMapBySlug, sql, type DanceRow } from "@/lib/db";

/**
 * API untuk GAME (Roblox HttpService).
 *   GET /api/v1/maps/<slug>/dances
 *   Header: x-onblox-key: <kunci API map>
 *   Opsional: ?since=<version> -> kalau tidak ada perubahan, balas { changed: false } (hemat).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/v1/maps/[slug]/dances">) {
  const { slug } = await ctx.params;
  const key = req.headers.get("x-onblox-key") ?? "";
  let map;
  try {
    map = await getMapBySlug(slug);
  } catch {
    return Response.json({ error: "Database belum siap" }, { status: 503 });
  }
  if (!map || !key || !keyMatches(key, map.key_hash)) {
    return Response.json({ error: "Map atau kunci API salah" }, { status: 401 });
  }
  // catat "game terakhir sinkron" (paling sering 1x per menit, tidak mengubah versi daftar)
  try {
    await sql()`
      UPDATE maps SET last_sync_at = now()
      WHERE id = ${map.id} AND (last_sync_at IS NULL OR last_sync_at < now() - interval '1 minute')`;
  } catch {
    /* status sinkron bukan hal penting; jangan sampai menggagalkan game */
  }
  const version = new Date(map.updated_at).getTime().toString();
  if (req.nextUrl.searchParams.get("since") === version) {
    return Response.json({ changed: false, version });
  }
  const rows = (await sql()`
    SELECT animation_id::text AS animation_id, name, category, asset_type FROM dances
    WHERE map_id = ${map.id} ORDER BY created_at ASC, id ASC`) as Pick<DanceRow, "animation_id" | "name" | "category" | "asset_type">[];
  return Response.json(
    {
      changed: true,
      map: map.slug,
      version,
      count: rows.length,
      dances: rows.map((d) => ({
        name: d.name,
        animationId: `rbxassetid://${d.animation_id}`,
        category: d.category,
        // "emote" → game membongkar ID emote marketplace jadi ID animasi asli
        type: d.asset_type ?? null,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
