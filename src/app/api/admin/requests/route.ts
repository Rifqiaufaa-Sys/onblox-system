import { z } from "zod";
import { pendingRequests, requireStaff } from "@/lib/access";
import { sql } from "@/lib/db";

export async function GET() {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  return Response.json({ requests: await pendingRequests() });
}

const Body = z.object({ sub: z.string().min(3).max(200), dismissed: z.boolean() });

/** Abaikan / kembalikan permintaan akses. */
export async function POST(req: Request) {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  if (parsed.data.dismissed) await sql()`UPDATE accounts SET dismissed = true WHERE sub = ${parsed.data.sub}`;
  else await sql()`UPDATE accounts SET dismissed = false WHERE sub = ${parsed.data.sub}`;
  return Response.json({ ok: true });
}
