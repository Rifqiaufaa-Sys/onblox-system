import { z } from "zod";
import { ensureSchema, sql, type MemberRow } from "./db";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const MemberInput = z
  .object({
    name: z.string().trim().min(1, "Nama wajib diisi").max(60),
    email: optional(200)
      .transform((v) => v?.toLowerCase() ?? null)
      .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Format email tidak valid"),
    discordId: optional(24).refine((v) => v === null || /^\d{15,22}$/.test(v), "Discord ID harus angka 15–22 digit"),
    role: z.enum(["admin", "client"]),
    mapIds: z.array(z.number().int().positive()).max(500).default([]),
  })
  .refine((v) => v.email || v.discordId, { message: "Isi email Google atau Discord ID (salah satu)" });

export type MemberInput = z.infer<typeof MemberInput>;

export async function listMembers(): Promise<MemberRow[]> {
  await ensureSchema();
  return (await sql()`
    SELECT m.*, COALESCE(array_agg(a.map_id) FILTER (WHERE a.map_id IS NOT NULL), '{}') AS map_ids
    FROM members m LEFT JOIN map_access a ON a.member_id = m.id
    GROUP BY m.id ORDER BY m.role ASC, m.created_at ASC`) as MemberRow[];
}

/** Ganti seluruh daftar map milik member (admin studio tidak perlu, dia otomatis semua map). */
export async function setMemberMaps(memberId: number, role: MemberInput["role"], mapIds: number[]) {
  const ids = role === "admin" ? [] : [...new Set(mapIds)];
  const db = sql();
  await db.transaction([
    db`DELETE FROM map_access WHERE member_id = ${memberId}`,
    db`
      INSERT INTO map_access (member_id, map_id)
      SELECT ${memberId}, id FROM maps WHERE id = ANY(${ids}::int[])`,
  ]);
}

export function duplicateMessage(e: unknown) {
  const s = String(e);
  if (!s.includes("duplicate")) return null;
  if (s.includes("email")) return "Email ini sudah terdaftar di member lain";
  if (s.includes("discord")) return "Discord ID ini sudah terdaftar di member lain";
  return "Member sudah terdaftar";
}
