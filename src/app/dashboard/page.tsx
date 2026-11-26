import Link from "next/link";
import { ensureSchema, sql, type MapRow } from "@/lib/db";
import SetupNeeded from "@/components/SetupNeeded";
import { requireSession } from "@/lib/auth";
import CreateMap from "./CreateMap";

export default async function DashboardPage() {
  await requireSession();
  let maps: MapRow[] = [];
  try {
    await ensureSchema();
    maps = (await sql()`
      SELECT m.id, m.slug, m.name, m.place_id, m.key_hint, m.created_at, m.updated_at,
             COUNT(d.id)::int AS dance_count
      FROM maps m LEFT JOIN dances d ON d.map_id = m.id
      GROUP BY m.id ORDER BY m.created_at ASC`) as MapRow[];
  } catch (e) {
    return <SetupNeeded message={String((e as Error).message)} />;
  }

  return (
    <div className="space-y-10">
      <div className="rise">
        <h1 className="text-3xl font-semibold tracking-tight">Map kamu</h1>
        <p className="mt-1 text-muted">Pilih map untuk mengelola dance-nya.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {maps.map((m, i) => (
          <Link
            key={m.id}
            href={`/dashboard/${m.slug}`}
            className="rise glass group rounded-3xl p-6 transition hover:border-[rgba(179,140,255,0.45)]"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold">{m.name}</h2>
              <span className="rounded-full bg-panel-strong px-2 py-0.5 font-mono text-xs text-muted">{m.slug}</span>
            </div>
            <p className="mt-6 text-4xl font-semibold tracking-tight">{m.dance_count ?? 0}</p>
            <p className="text-sm text-muted">dance dari website</p>
            <p className="mt-4 text-xs text-muted transition group-hover:text-accent">Kelola →</p>
          </Link>
        ))}
        <CreateMap />
      </div>
    </div>
  );
}
