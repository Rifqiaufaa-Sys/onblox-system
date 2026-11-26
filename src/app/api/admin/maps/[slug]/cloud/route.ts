import type { NextRequest } from "next/server";
import { z } from "zod";
import { isStaff, requireMap } from "@/lib/access";
import { sql } from "@/lib/db";
import { PING_MESSAGE, encryptSecret, keyHint, publish, pushMapNow, toUniverseId } from "@/lib/push";

type Ctx = RouteContext<"/api/admin/maps/[slug]/cloud">;

async function staffMap(slug: string) {
  const r = await requireMap(slug);
  if (r instanceof Response) return r;
  if (!isStaff(r.access)) return Response.json({ error: "Hanya admin studio" }, { status: 403 });
  return r;
}

const Body = z.object({
  /** Universe ID atau Place ID game */
  game: z.string().trim().min(5).max(40),
  /** kosongkan untuk tetap memakai key lama */
  apiKey: z.string().trim().max(2000).optional(),
});

/** Simpan pengaturan sinyal instan. Key dicoba dulu ke Roblox sebelum disimpan. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  const r = await staffMap((await ctx.params).slug);
  if (r instanceof Response) return r;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Isi Universe ID / Place ID" }, { status: 400 });

  const universeId = await toUniverseId(parsed.data.game);
  if (!universeId) return Response.json({ error: "ID game tidak terbaca" }, { status: 400 });

  const newKey = parsed.data.apiKey || null;
  if (!newKey && !r.map.cloud_key_enc) return Response.json({ error: "Masukkan Open Cloud API key" }, { status: 400 });

  if (newKey) {
    // coba kirim sinyal tes dulu (diabaikan game) supaya key yang salah tidak tersimpan
    const test = await publish(universeId, newKey, PING_MESSAGE);
    if (!test.ok) return Response.json({ error: test.error }, { status: 400 });
    await sql()`
      UPDATE maps SET universe_id = ${universeId}, cloud_key_enc = ${encryptSecret(newKey)},
        cloud_key_hint = ${keyHint(newKey)}, push_last_at = now(), push_last_error = NULL
      WHERE id = ${r.map.id}`;
  } else {
    await sql()`UPDATE maps SET universe_id = ${universeId} WHERE id = ${r.map.id}`;
    const test = await pushMapNow(r.map.id, PING_MESSAGE);
    if (test && !test.ok) return Response.json({ error: test.error, universeId }, { status: 400 });
  }
  return Response.json({ ok: true, universeId });
}

/** Kirim sinyal sungguhan sekarang (server game langsung mengambil daftar). */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const r = await staffMap((await ctx.params).slug);
  if (r instanceof Response) return r;
  const result = await pushMapNow(r.map.id);
  if (!result) return Response.json({ error: "Sinyal instan belum diatur" }, { status: 400 });
  return result.ok ? Response.json({ ok: true }) : Response.json({ error: result.error }, { status: 400 });
}

/** Matikan sinyal instan (hapus key). Game tetap jalan dengan cek berkala. */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const r = await staffMap((await ctx.params).slug);
  if (r instanceof Response) return r;
  await sql()`
    UPDATE maps SET universe_id = NULL, cloud_key_enc = NULL, cloud_key_hint = NULL,
      push_last_at = NULL, push_last_error = NULL
    WHERE id = ${r.map.id}`;
  return Response.json({ ok: true });
}
