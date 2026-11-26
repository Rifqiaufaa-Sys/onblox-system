import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql, type DanceRow } from "@/lib/db";
import { getAccess, canOpenMap, isStaff } from "@/lib/access";
import { getMapBySlug } from "@/lib/db";
import MapManager from "./MapManager";

export default async function MapPage({ params }: PageProps<"/dashboard/[slug]">) {
  // cek akses di page sendiri (bukan cuma di layout) — lihat CLAUDE.md
  const access = await getAccess();
  if (!access) redirect("/login");
  const { slug } = await params;
  const map = access.role === "none" ? null : await getMapBySlug(slug);
  // map yang tidak boleh dibuka diperlakukan seperti tidak ada
  if (!map || !canOpenMap(access, map.id)) notFound();

  const staff = isStaff(access);
  const [sync] = (await sql()`
    SELECT EXTRACT(EPOCH FROM now() - last_sync_at)::int AS age,
           EXTRACT(EPOCH FROM now() - push_last_at)::int AS push_age
    FROM maps WHERE id = ${map.id}`) as { age: number | null; push_age: number | null }[];
  const instant = Boolean(map.universe_id && map.cloud_key_enc);
  const push = staff
    ? {
        universeId: map.universe_id ? String(map.universe_id) : null,
        keyHint: map.cloud_key_hint ?? null,
        lastAgeSeconds: sync?.push_age === null || sync?.push_age === undefined ? null : Number(sync.push_age),
        error: map.push_last_error ?? null,
      }
    : null;
  const script = staff
    ? await readFile(path.join(process.cwd(), "roblox", "OnBloxDances.server.lua"), "utf8").catch(() => null)
    : null;

  const dances = (await sql()`
    SELECT id, animation_id::text AS animation_id, name, category, creator, asset_type, created_at
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
      <MapManager
        slug={map.slug}
        baseUrl={baseUrl}
        keyHint={map.key_hint}
        initialDances={dances}
        canManageKey={staff}
        script={script}
        push={push}
        instant={instant}
        placeId={map.place_id ? String(map.place_id) : undefined}
        syncAgeSeconds={sync?.age === null || sync?.age === undefined ? null : Number(sync.age)}
      />
    </div>
  );
}
