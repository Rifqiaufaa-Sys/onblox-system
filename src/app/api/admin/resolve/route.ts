import type { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { resolveAnimation } from "@/lib/roblox";

/** Pratinjau: ID -> nama animasi dari Roblox (dipakai saat mengetik di dashboard). */
export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (s instanceof Response) return s;
  const id = req.nextUrl.searchParams.get("id") ?? "";
  return Response.json(await resolveAnimation(id.replace(/\D/g, "")));
}
