import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireMap } from "@/lib/access";
import { notifyGame } from "@/lib/push";
import { sql, touchMap } from "@/lib/db";
import { cleanName, resolveAnimation } from "@/lib/roblox";

type Ctx = RouteContext<"/api/admin/maps/[slug]/dances/[id]">;

const Patch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  category: z.enum(["Dance", "Pose"]).optional(),
  /** ganti ID: boleh angka saja, rbxassetid://..., atau link marketplace */
  animationId: z.string().trim().max(200).optional(),
});

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  const { map } = r;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  const { name, category, animationId } = parsed.data;
  const danceId = Number(id);

  if (animationId !== undefined) {
    const newId = animationId.match(/(\d{5,20})/)?.[1];
    if (!newId) return Response.json({ error: "ID animasi tidak terbaca" }, { status: 400 });
    const [current] = (await sql()`
      SELECT animation_id::text AS animation_id FROM dances WHERE id = ${danceId} AND map_id = ${map.id}`) as {
      animation_id: string;
    }[];
    if (!current) return Response.json({ error: "Dance tidak ditemukan" }, { status: 404 });
    if (current.animation_id !== newId) {
      const res = await resolveAnimation(newId);
      if (!res.ok) return Response.json({ error: res.reason }, { status: 400 });
      try {
        await sql()`
          UPDATE dances SET animation_id = ${newId}, creator = ${res.creator}, asset_type = ${res.kind}
          WHERE id = ${danceId} AND map_id = ${map.id}`;
      } catch (e) {
        if (String(e).includes("duplicate")) {
          return Response.json({ error: "ID ini sudah ada di daftar dance map ini" }, { status: 409 });
        }
        throw e;
      }
    }
  }

  await sql()`
    UPDATE dances SET
      name = COALESCE(${name ? cleanName(name) : null}, name),
      category = COALESCE(${category ?? null}, category)
    WHERE id = ${danceId} AND map_id = ${map.id}`;
  await touchMap(map.id);
  notifyGame(map.id);
  return Response.json({ ok: true });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { slug, id } = await ctx.params;
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  const { map } = r;
  await sql()`DELETE FROM dances WHERE id = ${Number(id)} AND map_id = ${map.id}`;
  await touchMap(map.id);
  notifyGame(map.id);
  return Response.json({ ok: true });
}
