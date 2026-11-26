import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMapBySlug, sql } from "@/lib/db";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/maps/[slug]">) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const { slug } = await ctx.params;
  const map = await getMapBySlug(slug);
  if (!map) return Response.json({ error: "Map tidak ditemukan" }, { status: 404 });
  await sql()`DELETE FROM maps WHERE id = ${map.id}`;
  return Response.json({ ok: true });
}
