import { notFound, redirect } from "next/navigation";
import { getAccess, isStaff, ROLE_LABEL, type Access } from "@/lib/access";
import { ensureSchema, sql } from "@/lib/db";
import { listMembers } from "@/lib/members";
import SetupNeeded from "@/components/SetupNeeded";
import MembersManager, { type MapOption, type MemberView } from "@/components/MembersManager";

export default async function AksesPage() {
  // cek akses di page sendiri (bukan cuma di layout) — lihat CLAUDE.md
  let access: Access | null;
  let members: MemberView[] = [];
  let maps: MapOption[] = [];
  try {
    access = await getAccess();
    if (access && isStaff(access)) {
      await ensureSchema();
      const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);
      members = (await listMembers()).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        discordId: m.discord_id,
        role: m.role,
        accountName: m.account_name,
        avatar: m.avatar,
        lastLoginAt: iso(m.last_login_at),
        mapIds: (m.map_ids ?? []).map(Number),
      }));
      maps = (await sql()`SELECT id, name, slug FROM maps ORDER BY created_at ASC`) as MapOption[];
    }
  } catch (e) {
    return <SetupNeeded message={String((e as Error).message)} />;
  }
  if (!access) redirect("/login");
  if (!isStaff(access)) notFound();

  return (
    <div className="space-y-8">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">Akses</h1>
        <p className="mt-1 max-w-2xl text-muted">
          Hanya orang di daftar ini yang bisa membuka OnBlox System. Klien cuma melihat map yang kamu bagikan; orang
          lain yang login akan melihat halaman akses eksklusif.
        </p>
      </div>

      <section className="rise glass flex flex-wrap items-center gap-4 rounded-3xl p-5" style={{ animationDelay: "0.03s" }}>
        <span className="rounded-full bg-[rgba(179,140,255,0.15)] px-3 py-1 text-xs font-semibold text-accent">
          {ROLE_LABEL.owner}
        </span>
        <p className="flex-1 text-sm text-muted">
          Owner diatur dari Environment Variables Vercel (<code>ALLOWED_EMAILS</code>, <code>ALLOWED_DISCORD_IDS</code>), jadi
          tidak bisa terkunci dari sini. Kamu masuk sebagai <span className="text-text">{access.session.name}</span> ·{" "}
          {ROLE_LABEL[access.role]}.
        </p>
      </section>

      <MembersManager initialMembers={members} maps={maps} selfMemberId={access.memberId} />
    </div>
  );
}
