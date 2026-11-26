import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureSchema, sql, type MapRow } from "@/lib/db";
import { getAccess, isStaff, type Access } from "@/lib/access";
import SetupNeeded from "@/components/SetupNeeded";
import NoAccess from "@/components/NoAccess";
import CreateMap from "./CreateMap";

export default async function DashboardPage() {
  // cek akses di page sendiri (bukan cuma di layout) — lihat CLAUDE.md
  let access: Access | null;
  let maps: MapRow[] = [];
  try {
    access = await getAccess();
    if (access && access.role !== "none") {
      await ensureSchema();
      const ids = access.mapIds === "all" ? null : access.mapIds;
      maps = (await sql()`
        SELECT m.id, m.slug, m.name, m.place_id, m.key_hint, m.created_at, m.updated_at,
               COUNT(d.id)::int AS dance_count
        FROM maps m LEFT JOIN dances d ON d.map_id = m.id
        WHERE ${ids}::int[] IS NULL OR m.id = ANY(${ids}::int[])
        GROUP BY m.id ORDER BY m.created_at ASC`) as MapRow[];
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

      {!staff && maps.length === 0 ? (
        <div className="rise glass rounded-3xl p-8 text-center">
          <p className="font-medium">Belum ada map yang dibagikan ke kamu.</p>
          <p className="mt-1 text-sm text-muted">Tim OnBlox akan menambahkan map kamu setelah sistemnya terpasang di game.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <p className="mt-4 text-xs text-muted transition group-hover:text-accent">Kelola →</p>
            </Link>
          ))}
          {staff && <CreateMap />}
        </div>
      )}
    </div>
  );
}
