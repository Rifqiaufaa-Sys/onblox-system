import { requireStaff } from "@/lib/access";
import { sql, type MemberRow } from "@/lib/db";
import { MemberInput, duplicateMessage, listMembers, setMemberMaps } from "@/lib/members";

export async function GET() {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  return Response.json({ members: await listMembers() });
}

export async function POST(req: Request) {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  const parsed = MemberInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const { name, email, discordId, role, mapIds } = parsed.data;
  try {
    const rows = (await sql()`
      INSERT INTO members (name, email, discord_id, role, created_by)
      VALUES (${name}, ${email}, ${discordId}, ${role}, ${s.session.sub})
      RETURNING id`) as Pick<MemberRow, "id">[];
    await setMemberMaps(rows[0].id, role, mapIds);
    return Response.json({ ok: true, id: rows[0].id }, { status: 201 });
  } catch (e) {
    const msg = duplicateMessage(e);
    if (msg) return Response.json({ error: msg }, { status: 409 });
    throw e;
  }
}
