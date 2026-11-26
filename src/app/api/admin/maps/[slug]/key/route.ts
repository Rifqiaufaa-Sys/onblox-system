import type { NextRequest } from "next/server";
import { newApiKey } from "@/lib/auth";
import { isStaff, requireMap } from "@/lib/access";
import { sql } from "@/lib/db";

/** Buat kunci API baru (kunci lama langsung tidak berlaku). */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/admin/maps/[slug]/key">) {
  const { slug } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  if (!isStaff(r.access)) return Response.json({ error: "Hanya admin studio" }, { status: 403 });
  const { map } = r;
  const key = newApiKey();
  await sql()`UPDATE maps SET key_hash = ${key.hash}, key_hint = ${key.hint} WHERE id = ${map.id}`;
  return Response.json({ apiKey: key.key, keyHint: key.hint });
}
