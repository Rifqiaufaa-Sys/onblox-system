import type { NextRequest } from "next/server";
import { isStaff, requireMap } from "@/lib/access";
import { sql } from "@/lib/db";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/admin/maps/[slug]">) {
  const { slug } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  if (!isStaff(r.access)) return Response.json({ error: "Hanya admin studio" }, { status: 403 });
  const { map } = r;
  await sql()`DELETE FROM maps WHERE id = ${map.id}`;
  return Response.json({ ok: true });
}
