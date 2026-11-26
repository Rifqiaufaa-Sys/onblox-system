import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/access";
import { sql } from "@/lib/db";
import { MemberInput, duplicateMessage, setMemberMaps } from "@/lib/members";

type Ctx = RouteContext<"/api/admin/members/[id]">;

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "ID tidak valid" }, { status: 400 });
  // admin studio tidak boleh mengubah dirinya sendiri (mencegah terkunci tanpa sengaja)
  if (s.memberId === id) return Response.json({ error: "Tidak bisa mengubah akses diri sendiri" }, { status: 400 });

  const parsed = MemberInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const { name, email, discordId, role, mapIds } = parsed.data;
  try {
    const rows = await sql()`
      UPDATE members SET name = ${name}, email = ${email}, discord_id = ${discordId}, role = ${role}
      WHERE id = ${id} RETURNING id`;
    if (rows.length === 0) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
    await setMemberMaps(id, role, mapIds);
    return Response.json({ ok: true });
  } catch (e) {
    const msg = duplicateMessage(e);
    if (msg) return Response.json({ error: msg }, { status: 409 });
    throw e;
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "ID tidak valid" }, { status: 400 });
  if (s.memberId === id) return Response.json({ error: "Tidak bisa menghapus diri sendiri" }, { status: 400 });
  await sql()`DELETE FROM members WHERE id = ${id}`;
  return Response.json({ ok: true });
}
