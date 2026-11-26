import { z } from "zod";
import { checkAdminPassword, createSession } from "@/lib/auth";

const Body = z.object({ password: z.string().min(1).max(200) });

// rate limit sederhana per instance (cukup untuk panel admin kecil)
const attempts = new Map<string, { n: number; until: number }>();

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const a = attempts.get(ip);
  if (a && a.until > Date.now() && a.n >= 5) {
    return Response.json({ error: "Terlalu banyak percobaan. Coba lagi 5 menit lagi." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !checkAdminPassword(parsed.data.password)) {
    const cur = a && a.until > Date.now() ? a : { n: 0, until: Date.now() + 5 * 60_000 };
    cur.n += 1;
    attempts.set(ip, cur);
    return Response.json({ error: "Password salah" }, { status: 401 });
  }
  attempts.delete(ip);
  await createSession({ sub: "password:admin", name: "Owner", avatar: null, provider: "password", email: null });
  return Response.json({ ok: true });
}
