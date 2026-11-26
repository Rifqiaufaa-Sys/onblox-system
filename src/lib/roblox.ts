/**
 * Ubah ID animasi Roblox jadi nama, langsung dari katalog Roblox.
 * AssetTypeId 24 = Animation, 61 = EmoteAnimation. Selain itu ditolak (bukan animasi).
 */
export type ResolvedAnimation =
  | { ok: true; id: string; name: string; creator: string | null; verified: boolean }
  | { ok: false; id: string; reason: string };

const ANIMATION_TYPES = new Set([24, 61]);

export function cleanName(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001f]/g, "")
    .trim()
    .slice(0, 60);
}

export async function resolveAnimation(id: string): Promise<ResolvedAnimation> {
  if (!/^\d{5,20}$/.test(id)) return { ok: false, id, reason: "ID tidak valid" };
  try {
    const res = await fetch(`https://economy.roblox.com/v2/assets/${id}/details`, {
      headers: { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (res.status === 400 || res.status === 404) {
      return { ok: false, id, reason: "Asset tidak ditemukan di Roblox" };
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = (await res.json()) as {
      Name?: string;
      AssetTypeId?: number;
      Creator?: { Name?: string };
    };
    if (typeof info.AssetTypeId === "number" && !ANIMATION_TYPES.has(info.AssetTypeId)) {
      return { ok: false, id, reason: `Bukan animasi (tipe asset ${info.AssetTypeId})` };
    }
    const name = cleanName(info.Name ?? "") || `Dance ${id}`;
    return { ok: true, id, name, creator: info.Creator?.Name ?? null, verified: true };
  } catch {
    // Roblox sedang sibuk / rate limit: tetap terima, nama sementara bisa diganti nanti
    return { ok: true, id, name: `Dance ${id}`, creator: null, verified: false };
  }
}

/**
 * Baca daftar yang di-paste. Mendukung format bebas, satu dance per baris:
 *   128964914252376
 *   rbxassetid://128964914252376
 *   Two Groove : rbxassetid://128964914252376
 *   Two Groove = rbxassetid://128964914252376
 *   Two Groove    rbxassetid://128964914252376
 * Kalau nama ditulis, nama itu yang dipakai (tidak diambil dari Roblox).
 */
export function parseDanceList(text: string): { id: string; name: string | null }[] {
  const out: { id: string; name: string | null }[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n|,(?=\s*\d)/)) {
    const m = line.match(/(\d{5,20})/);
    if (!m) continue;
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const before = line
      .slice(0, m.index)
      .replace(/(rbxassetid:\/\/|https?:\/\/\S*?id=|https?:\/\/\S*\/)$/i, "")
      .replace(/[:=\-–|]+\s*$/g, "")
      .trim();
    out.push({ id, name: before ? cleanName(before) : null });
  }
  return out;
}
