import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getMapBySlug, sql, touchMap, type DanceRow } from "@/lib/db";
import { parseDanceList, resolveAnimation } from "@/lib/roblox";

type Ctx = RouteContext<"/api/admin/maps/[slug]/dances">;

export async function GET(_req: NextRequest, ctx: Ctx) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const { slug } = await ctx.params;
  const map = await getMapBySlug(slug);
  if (!map) return Response.json({ error: "Map tidak ditemukan" }, { status: 404 });
  const dances = (await sql()`
    SELECT * FROM dances WHERE map_id = ${map.id} ORDER BY created_at DESC, id DESC`) as DanceRow[];
  const { key_hash: _omit, ...publicMap } = map;
  void _omit;
  return Response.json({ map: publicMap, dances });
}

const Body = z.object({
  text: z.string().min(1).max(20000),
  category: z.enum(["Dance", "Pose"]).default("Dance"),
});

const MAX_PER_REQUEST = 150;

// cek ke Roblox untuk banyak ID bisa makan waktu; beri waktu lebih di Vercel
export const maxDuration = 60;

export async function POST(req: NextRequest, ctx: Ctx) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const { slug } = await ctx.params;
  const map = await getMapBySlug(slug);
  if (!map) return Response.json({ error: "Map tidak ditemukan" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data tidak valid" }, { status: 400 });

  const items = parseDanceList(parsed.data.text);
  if (items.length === 0) {
    return Response.json({ error: "Tidak ada ID animasi yang terbaca" }, { status: 400 });
  }
  if (items.length > MAX_PER_REQUEST) {
    return Response.json({ error: `Maksimal ${MAX_PER_REQUEST} dance sekali tambah` }, { status: 400 });
  }

  const existing = (await sql()`
    SELECT animation_id::text AS id FROM dances
    WHERE map_id = ${map.id} AND animation_id = ANY(${items.map((i) => i.id)}::bigint[])`) as { id: string }[];
  const have = new Set(existing.map((r) => r.id));

  type Result = { id: string; status: "added" | "duplicate" | "invalid"; name?: string; reason?: string; verified?: boolean };
  const results: Result[] = [];

  // cek ke Roblox paralel, 8 sekaligus supaya tidak kena rate limit
  const todo = items.filter((i) => {
    if (have.has(i.id)) {
      results.push({ id: i.id, status: "duplicate", name: i.name ?? undefined });
      return false;
    }
    return true;
  });
  for (let i = 0; i < todo.length; i += 8) {
    const batch = todo.slice(i, i + 8);
    const resolved = await Promise.all(batch.map((b) => resolveAnimation(b.id)));
    for (let j = 0; j < batch.length; j++) {
      const r = resolved[j];
      const wanted = batch[j];
      if (!r.ok) {
        results.push({ id: wanted.id, status: "invalid", reason: r.reason });
        continue;
      }
      const name = wanted.name ?? r.name;
      await sql()`
        INSERT INTO dances (map_id, animation_id, name, category, creator, added_by)
        VALUES (${map.id}, ${wanted.id}, ${name}, ${parsed.data.category}, ${r.creator}, ${s.sub})
        ON CONFLICT (map_id, animation_id) DO NOTHING`;
      results.push({ id: wanted.id, status: "added", name, verified: r.verified });
    }
  }
  if (results.some((r) => r.status === "added")) await touchMap(map.id);
  return Response.json({ results });
}
