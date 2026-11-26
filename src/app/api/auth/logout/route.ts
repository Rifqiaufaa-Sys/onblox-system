import { cookies } from "next/headers";
import { clearSession } from "@/lib/auth";
import { PREVIEW_COOKIE } from "@/lib/access";

export async function POST() {
  await clearSession();
  (await cookies()).delete(PREVIEW_COOKIE);
  return Response.json({ ok: true });
}
