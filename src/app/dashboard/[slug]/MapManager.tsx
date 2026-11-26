"use client";

import { useCallback, useMemo, useState } from "react";
import { KeyReveal } from "@/components/KeyReveal";

export type Dance = {
  id: number;
  animation_id: string;
  name: string;
  category: string;
  creator: string | null;
  created_at: string;
};

type AddResult = {
  id: string;
  status: "added" | "duplicate" | "invalid";
  name?: string;
  reason?: string;
  verified?: boolean;
};

const STATUS_STYLE: Record<AddResult["status"], string> = {
  added: "text-ok",
  duplicate: "text-warn",
  invalid: "text-bad",
};
const STATUS_LABEL: Record<AddResult["status"], string> = {
  added: "masuk",
  duplicate: "sudah ada",
  invalid: "ditolak",
};

export default function MapManager({
  slug,
  baseUrl,
  keyHint,
  initialDances,
}: {
  slug: string;
  baseUrl: string;
  keyHint: string;
  initialDances: Dance[];
}) {
  const api = `/api/admin/maps/${slug}`;
  const [dances, setDances] = useState<Dance[] | null>(initialDances);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<"Dance" | "Pose">("Dance");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<AddResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`${api}/dances`, { cache: "no-store" });
    if (res.ok) setDances((await res.json()).dances);
  }, [api]);

  const pasted = useMemo(() => {
    const ids = new Set<string>();
    for (const m of text.matchAll(/\d{5,20}/g)) ids.add(m[0]);
    return ids.size;
  }, [text]);

  async function add() {
    setBusy(true);
    setError(null);
    setResults(null);
    const res = await fetch(`${api}/dances`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, category }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Gagal menambah");
    setResults(data.results);
    if ((data.results as AddResult[]).some((r) => r.status === "added")) setText("");
    load();
  }

  async function patch(d: Dance, body: Partial<Pick<Dance, "name" | "category">>) {
    setDances((list) => list?.map((x) => (x.id === d.id ? { ...x, ...body } : x)) ?? null);
    await fetch(`${api}/dances/${d.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function remove(d: Dance) {
    if (!confirm(`Hapus "${d.name}" dari map ini?`)) return;
    setDances((list) => list?.filter((x) => x.id !== d.id) ?? null);
    await fetch(`${api}/dances/${d.id}`, { method: "DELETE" });
  }

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!dances) return [];
    if (!q) return dances;
    return dances.filter((d) => d.name.toLowerCase().includes(q) || d.animation_id.includes(q));
  }, [dances, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* ---------- tambah dance ---------- */}
      <section className="rise glass rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Tambah dance</h2>
        <p className="mt-1 text-sm text-muted">
          Paste ID animasi, satu per baris. Bisa juga format <span className="font-mono">Nama : rbxassetid://ID</span>.
          Kalau nama tidak ditulis, nama diambil dari Roblox.
        </p>
        <textarea
          className="input mt-4 min-h-44 font-mono text-xs leading-relaxed"
          placeholder={"128964914252376\nTwo Groove : rbxassetid://128964914252376\nrbxassetid://126649778668933"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="glass flex rounded-full p-1 text-sm">
            {(["Dance", "Pose"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3 py-1 transition ${category === c ? "bg-accent text-[#0b0913]" : "text-muted"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" disabled={busy || pasted === 0} onClick={add}>
            {busy ? "Mengecek ke Roblox…" : pasted ? `Tambah ${pasted} dance` : "Tambah"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        {results && (
          <ul className="mt-4 max-h-56 space-y-1 overflow-y-auto text-sm">
            {results.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
                <span className="truncate">
                  {r.name ?? r.reason ?? "—"}
                  {r.status === "added" && r.verified === false && (
                    <span className="ml-2 text-xs text-warn">(nama sementara, Roblox tidak menjawab)</span>
                  )}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="font-mono text-xs text-muted">{r.id}</span>
                  <span className={`text-xs font-semibold ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------- koneksi ke game ---------- */}
      <GameConnection slug={slug} baseUrl={baseUrl} keyHint={keyHint} />

      {/* ---------- daftar dance ---------- */}
      <section className="rise glass rounded-3xl p-6 lg:col-span-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Dance dari website <span className="text-muted font-normal">· {dances?.length ?? "…"}</span>
          </h2>
          <input className="input max-w-xs" placeholder="Cari nama atau ID…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {dances === null ? (
          <p className="mt-6 text-sm text-muted">Memuat…</p>
        ) : shown.length === 0 ? (
          <p className="mt-6 text-sm text-muted">{dances.length ? "Tidak ada yang cocok." : "Belum ada dance. Tambahkan di atas."}</p>
        ) : (
          <ul className="mt-5 divide-y divide-line">
            {shown.map((d) => (
              <DanceRow key={d.id} dance={d} onPatch={patch} onRemove={remove} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function DanceRow({
  dance,
  onPatch,
  onRemove,
}: {
  dance: Dance;
  onPatch: (d: Dance, body: Partial<Pick<Dance, "name" | "category">>) => void;
  onRemove: (d: Dance) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(dance.name);

  function save() {
    setEditing(false);
    const v = name.trim();
    if (v && v !== dance.name) onPatch(dance, { name: v });
    else setName(dance.name);
  }

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            className="input py-1.5"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") {
                setName(dance.name);
                setEditing(false);
              }
            }}
          />
        ) : (
          <button className="truncate text-left font-medium hover:text-accent" title="Klik untuk ganti nama" onClick={() => setEditing(true)}>
            {dance.name}
          </button>
        )}
        <p className="font-mono text-xs text-muted">
          rbxassetid://{dance.animation_id}
          {dance.creator ? ` · ${dance.creator}` : ""}
        </p>
      </div>
      <button
        className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:text-text"
        title="Klik untuk pindah kategori"
        onClick={() => onPatch(dance, { category: dance.category === "Dance" ? "Pose" : "Dance" })}
      >
        {dance.category}
      </button>
      <button className="btn btn-danger px-3 py-1.5 text-xs" onClick={() => onRemove(dance)}>
        Hapus
      </button>
    </li>
  );
}

function GameConnection({ slug, baseUrl, keyHint }: { slug: string; baseUrl: string; keyHint: string }) {
  const [newKey, setNewKey] = useState<string | null>(null);
  const [hint, setHint] = useState(keyHint);
  const [busy, setBusy] = useState(false);
  const endpoint = `${baseUrl}/api/v1/maps/${slug}/dances`;
  const lua = `-- ServerScriptService > OnBlox > Config (ModuleScript)
return {
\tUrl = "${endpoint}",
\tKey = "${newKey ?? "<tempel kunci API di sini>"}",
\tRefreshSeconds = 60,
}`;

  async function rotate() {
    if (!confirm("Buat kunci baru? Kunci lama langsung tidak berlaku, jadi game harus diupdate.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/maps/${slug}/key`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      setNewKey(data.apiKey);
      setHint(data.keyHint);
    }
  }

  return (
    <section className="rise glass rounded-3xl p-6" style={{ animationDelay: "0.05s" }}>
      <h2 className="text-lg font-semibold">Sambungan ke game</h2>
      <p className="mt-1 text-sm text-muted">Server Roblox mengambil daftar dance dari alamat ini.</p>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-muted">Endpoint</dt>
          <dd className="mt-1 break-all rounded-xl bg-black/30 px-3 py-2 font-mono text-xs">{endpoint}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <dt className="text-muted">Kunci API</dt>
            <dd className="font-mono text-xs">{hint}</dd>
          </div>
          <button className="btn btn-ghost" disabled={busy} onClick={rotate}>
            {busy ? "…" : "Buat kunci baru"}
          </button>
        </div>
      </dl>
      {newKey && <KeyReveal apiKey={newKey} />}
      <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/40 p-4 font-mono text-xs leading-relaxed text-muted">{lua}</pre>
    </section>
  );
}
