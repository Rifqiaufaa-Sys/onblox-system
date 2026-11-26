import { z } from "zod";
import { requireAdmin, newApiKey } from "@/lib/auth";
import { ensureSchema, sql, type MapRow } from "@/lib/db";

export async function GET() {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  try {
    await ensureSchema();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 503 });
  }
  const maps = (await sql()`
    SELECT m.id, m.slug, m.name, m.place_id, m.key_hint, m.created_at, m.updated_at,
           COUNT(d.id)::int AS dance_count
    FROM maps m LEFT JOIN dances d ON d.map_id = m.id
    GROUP BY m.id ORDER BY m.created_at ASC`) as MapRow[];
  return Response.json({ maps });
}

const Body = z.object({
  name: z.string().trim().min(2).max(60),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Slug hanya huruf kecil, angka, dan tanda -"),
  placeId: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : String(v)))
    .refine((v) => v === null || /^\d{1,20}$/.test(v), "Place ID harus angka"),
});

export async function POST(req: Request) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  await ensureSchema();
  const { name, slug, placeId } = parsed.data;
  const key = newApiKey();
  try {
    const rows = (await sql()`
      INSERT INTO maps (slug, name, place_id, key_hash, key_hint)
      VALUES (${slug}, ${name}, ${placeId}, ${key.hash}, ${key.hint})
      RETURNING id, slug, name, place_id, key_hint, created_at, updated_at`) as MapRow[];
    // kunci asli hanya dikirim sekali, saat dibuat
    return Response.json({ map: rows[0], apiKey: key.key }, { status: 201 });
  } catch (e) {
    if (String(e).includes("duplicate")) {
      return Response.json({ error: "Slug sudah dipakai map lain" }, { status: 409 });
    }
    throw e;
  }
}
