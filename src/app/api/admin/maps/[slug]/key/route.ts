import type { NextRequest } from "next/server";
import { newApiKey, requireAdmin } from "@/lib/auth";
import { getMapBySlug, sql } from "@/lib/db";

/** Buat kunci API baru (kunci lama langsung tidak berlaku). */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/admin/maps/[slug]/key">) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const { slug } = await ctx.params;
  const map = await getMapBySlug(slug);
  if (!map) return Response.json({ error: "Map tidak ditemukan" }, { status: 404 });
  const key = newApiKey();
  await sql()`UPDATE maps SET key_hash = ${key.hash}, key_hint = ${key.hint} WHERE id = ${map.id}`;
  return Response.json({ apiKey: key.key, keyHint: key.hint });
}
