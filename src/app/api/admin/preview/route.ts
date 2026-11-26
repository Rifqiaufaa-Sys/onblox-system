import { cookies } from "next/headers";
import { z } from "zod";
import { PREVIEW_COOKIE, requireStaff } from "@/lib/access";
import { sql } from "@/lib/db";

const Body = z.object({ target: z.union([z.literal("guest"), z.number().int().positive()]) });

/** Nyalakan mode "Lihat sebagai" (hanya owner/admin studio). Hanya mengubah tampilan halaman. */
export async function POST(req: Request) {
  const s = await requireStaff();
  if (s instanceof Response) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Data tidak valid" }, { status: 400 });
  const { target } = parsed.data;
  if (target !== "guest") {
    const rows = await sql()`SELECT id FROM members WHERE id = ${target}`;
    if (rows.length === 0) return Response.json({ error: "Member tidak ditemukan" }, { status: 404 });
  }
  (await cookies()).set(PREVIEW_COOKIE, target === "guest" ? "guest" : `member:${target}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 2 * 60 * 60,
  });
  return Response.json({ ok: true });
}

/** Keluar dari mode pratinjau. */
export async function DELETE() {
  (await cookies()).delete(PREVIEW_COOKIE);
  return Response.json({ ok: true });
}
