import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureSchema, sql, type MapRow } from "@/lib/db";
import { getAccess, isStaff, pendingRequests, type Access } from "@/lib/access";
import SetupGuide, { type GuideState } from "@/components/SetupGuide";
import SetupNeeded from "@/components/SetupNeeded";
import NoAccess from "@/components/NoAccess";
import CreateMap from "./CreateMap";

export default async function DashboardPage() {
  // cek akses di page sendiri (bukan cuma di layout) — lihat CLAUDE.md
  let access: Access | null;
  let maps: (MapRow & { sync_age_s: number | null })[] = [];
  let guide: GuideState | null = null;
  try {
    access = await getAccess();
    if (access && access.role !== "none") {
      await ensureSchema();
      const ids = access.mapIds === "all" ? null : access.mapIds;
      maps = (await sql()`
        SELECT m.id, m.slug, m.name, m.place_id, m.key_hint, m.created_at, m.updated_at, m.last_sync_at,
               EXTRACT(EPOCH FROM now() - m.last_sync_at)::int AS sync_age_s,
               COUNT(d.id)::int AS dance_count
        FROM maps m LEFT JOIN dances d ON d.map_id = m.id
        WHERE ${ids}::int[] IS NULL OR m.id = ANY(${ids}::int[])
        GROUP BY m.id ORDER BY m.created_at ASC`) as (MapRow & { sync_age_s: number | null })[];
      if (isStaff(access)) {
        const [c] = (await sql()`
          SELECT COUNT(DISTINCT a.member_id)::int AS n FROM map_access a
          JOIN members m ON m.id = a.member_id WHERE m.role = 'client'`) as { n: number }[];
        guide = {
          maps: maps.length,
          synced: maps.some((m) => m.last_sync_at),
          dances: maps.reduce((t, m) => t + Number(m.dance_count ?? 0), 0),
          clients: Number(c?.n ?? 0),
          pending: access.preview ? 0 : (await pendingRequests(50)).length,
          firstMapSlug: maps[0]?.slug ?? null,
        };
      }
    }
  } catch (e) {
    return <SetupNeeded message={String((e as Error).message)} />;
  }
  if (!access) redirect("/login");
  if (access.role === "none") return <NoAccess session={access.session} />;

  const staff = isStaff(access);

  return (
    <div className="space-y-10">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">{staff ? "Semua map" : "Map kamu"}</h1>
        <p className="mt-1 text-muted">
          {staff
            ? "Semua map klien yang terhubung ke OnBlox System. Atur siapa yang bisa membuka tiap map di menu Akses."
            : "Map hasil commission kamu. Pilih map untuk mengelola dance-nya."}
        </p>
      </div>

      {guide && <SetupGuide s={guide} />}

      {!staff && maps.length === 0 ? (
        <div className="rise glass rounded-3xl p-8 text-center">
          <p className="font-medium">Belum ada map yang dibagikan ke kamu.</p>
          <p className="mt-1 text-sm text-muted">Tim OnBlox akan menambahkan map kamu setelah sistemnya terpasang di game.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {maps.map((m, i) => (
            <Link
              key={m.id}
              href={`/dashboard/${m.slug}`}
              className="rise glass group rounded-3xl p-6 transition hover:border-[rgba(179,140,255,0.45)]"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{m.name}</h2>
                <span className="shrink-0 rounded-full bg-panel-strong px-2 py-0.5 font-mono text-xs text-muted">{m.slug}</span>
              </div>
              <p className="mt-6 text-4xl font-semibold tracking-tight">{m.dance_count ?? 0}</p>
              <p className="text-sm text-muted">dance dari website</p>
              <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                <SyncStatus ageSeconds={m.sync_age_s === null ? null : Number(m.sync_age_s)} />
                <span className="text-muted transition group-hover:text-accent">Kelola →</span>
              </div>
            </Link>
          ))}
          {staff && <CreateMap />}
        </div>
      )}
    </div>
  );
}

/** Status sambungan game, dari kapan server Roblox terakhir mengambil daftar dance. */
function SyncStatus({ ageSeconds }: { ageSeconds: number | null }) {
  if (ageSeconds === null) return <span className="text-warn">○ Belum tersambung ke game</span>;
  const min = ageSeconds / 60;
  const label = min < 1 ? "barusan" : min < 60 ? `${Math.floor(min)} mnt lalu` : min < 1440 ? `${Math.floor(min / 60)} jam lalu` : `${Math.floor(min / 1440)} hari lalu`;
  return min < 10 ? (
    <span className="text-ok">● Game online · {label}</span>
  ) : (
    <span className="text-muted">● Terakhir sinkron {label}</span>
  );
}
