import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireMap } from "@/lib/access";
import { sql, touchMap } from "@/lib/db";
import { cleanName } from "@/lib/roblox";

type Ctx = RouteContext<"/api/admin/maps/[slug]/dances/[id]">;

const Patch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  category: z.enum(["Dance", "Pose"]).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  const { map } = r;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  const { name, category } = parsed.data;
  await sql()`
    UPDATE dances SET
      name = COALESCE(${name ? cleanName(name) : null}, name),
      category = COALESCE(${category ?? null}, category)
    WHERE id = ${Number(id)} AND map_id = ${map.id}`;
  await touchMap(map.id);
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  const { map } = r;
  await sql()`DELETE FROM dances WHERE id = ${Number(id)} AND map_id = ${map.id}`;
  await touchMap(map.id);
  return Response.json({ ok: true });
}
