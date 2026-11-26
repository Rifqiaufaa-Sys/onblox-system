import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getMapBySlug, sql, type DanceRow } from "@/lib/db";
import MapManager from "./MapManager";

export default async function MapPage({ params }: PageProps<"/dashboard/[slug]">) {
  const { slug } = await params;
  const map = await getMapBySlug(slug);
  if (!map) notFound();

  const dances = (await sql()`
    SELECT id, animation_id::text AS animation_id, name, category, creator, created_at
    FROM dances WHERE map_id = ${map.id} ORDER BY created_at DESC, id DESC`) as DanceRow[];

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="space-y-8">
      <div className="rise">
        <Link href="/dashboard" className="text-sm text-muted hover:text-text">
          ← Semua map
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{map.name}</h1>
        <p className="mt-1 font-mono text-sm text-muted">
          {map.slug}
          {map.place_id ? ` · place ${map.place_id}` : ""}
        </p>
      </div>
      <MapManager slug={map.slug} baseUrl={baseUrl} keyHint={map.key_hint} initialDances={dances} />
    </div>
  );
}
