"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type MapOption = { id: number; name: string; slug: string };
export type MemberView = {
  id: number;
  name: string;
  email: string | null;
  discordId: string | null;
  role: "admin" | "client";
  accountName: string | null;
  avatar: string | null;
  lastLoginAt: string | null;
  mapIds: number[];
};

type Draft = { name: string; email: string; discordId: string; role: "admin" | "client"; mapIds: number[] };

const EMPTY: Draft = { name: "", email: "", discordId: "", role: "client", mapIds: [] };

function toDraft(m: MemberView): Draft {
  return { name: m.name, email: m.email ?? "", discordId: m.discordId ?? "", role: m.role, mapIds: m.mapIds };
}

function timeAgo(iso: string | null) {
  if (!iso) return "Belum pernah masuk";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "Masuk barusan";
  if (diff < 3600) return `Masuk ${Math.floor(diff / 60)} menit lalu`;
  if (diff < 86400) return `Masuk ${Math.floor(diff / 3600)} jam lalu`;
  return `Masuk ${Math.floor(diff / 86400)} hari lalu`;
}

export default function MembersManager({
  initialMembers,
  maps,
  selfMemberId,
}: {
  initialMembers: MemberView[];
  maps: MapOption[];
  selfMemberId: number | null;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [editing, setEditing] = useState<number | "new" | null>(initialMembers.length === 0 ? "new" : null);
  const [query, setQuery] = useState("");

  const mapName = useMemo(() => new Map(maps.map((m) => [m.id, m.name])), [maps]);

  async function reload() {
    const res = await fetch("/api/admin/members", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMembers(
        (data.members as Record<string, unknown>[]).map((m) => ({
          id: m.id as number,
          name: m.name as string,
          email: (m.email as string) ?? null,
          discordId: (m.discord_id as string) ?? null,
          role: m.role as MemberView["role"],
          accountName: (m.account_name as string) ?? null,
          avatar: (m.avatar as string) ?? null,
          lastLoginAt: (m.last_login_at as string) ?? null,
          mapIds: ((m.map_ids as number[]) ?? []).map(Number),
        })),
      );
    }
    router.refresh();
  }

  async function save(id: number | "new", d: Draft) {
    const res = await fetch(id === "new" ? "/api/admin/members" : `/api/admin/members/${id}`, {
      method: id === "new" ? "POST" : "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(d),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return (data.error as string) ?? "Gagal menyimpan";
    setEditing(null);
    await reload();
    return null;
  }

  async function remove(m: MemberView) {
    if (!confirm(`Cabut semua akses ${m.name}? Dia tidak bisa membuka OnBlox System lagi.`)) return;
    await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
    await reload();
  }

  const q = query.trim().toLowerCase();
  const shown = members.filter(
    (m) =>
      !q ||
      [m.name, m.email, m.discordId, m.accountName].some((v) => v?.toLowerCase().includes(q)) ||
      m.mapIds.some((id) => mapName.get(id)?.toLowerCase().includes(q)),
  );
  const groups = [
    { role: "admin" as const, title: "Admin studio", hint: "Semua map + kelola akses", list: shown.filter((m) => m.role === "admin") },
    { role: "client" as const, title: "Klien", hint: "Hanya map yang dibagikan", list: shown.filter((m) => m.role === "client") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="input max-w-xs"
          placeholder="Cari nama, email, Discord ID, map…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {editing !== "new" && (
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            ＋ Beri akses
          </button>
        )}
      </div>

      {editing === "new" && (
        <MemberForm
          title="Beri akses baru"
          initial={EMPTY}
          maps={maps}
          submitLabel="Beri akses"
          onSubmit={(d) => save("new", d)}
          onCancel={() => setEditing(null)}
        />
      )}

      {groups.map((g) => (
        <section key={g.role} className="space-y-3">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-semibold">
              {g.title} <span className="font-normal text-muted">· {g.list.length}</span>
            </h2>
            <span className="text-xs text-muted">{g.hint}</span>
          </div>
          {g.list.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-line p-5 text-sm text-muted">
              {q ? "Tidak ada yang cocok." : g.role === "client" ? "Belum ada klien. Klik “Beri akses” untuk menambahkan." : "Belum ada admin studio."}
            </p>
          ) : (
            <div className="grid gap-3">
              {g.list.map((m) =>
                editing === m.id ? (
                  <MemberForm
                    key={m.id}
                    title={`Ubah akses ${m.name}`}
                    initial={toDraft(m)}
                    maps={maps}
                    submitLabel="Simpan"
                    onSubmit={(d) => save(m.id, d)}
                    onCancel={() => setEditing(null)}
                  />
                ) : (
                  <MemberCard
                    key={m.id}
                    m={m}
                    mapName={mapName}
                    isSelf={m.id === selfMemberId}
                    onEdit={() => setEditing(m.id)}
                    onRemove={() => remove(m)}
                  />
                ),
              )}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function MemberCard({
  m,
  mapName,
  isSelf,
  onEdit,
  onRemove,
}: {
  m: MemberView;
  mapName: Map<number, string>;
  isSelf: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="glass flex flex-wrap items-center gap-4 rounded-3xl p-5">
      {m.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.avatar} alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
      ) : (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-panel-strong font-semibold text-muted">
          {m.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {m.name}
          {isSelf && <span className="ml-2 text-xs font-normal text-accent">(kamu)</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {[m.discordId && `Discord ${m.discordId}`, m.email].filter(Boolean).join(" · ")}
          {m.accountName && m.accountName !== m.name && ` · login sebagai ${m.accountName}`}
        </p>
        <p className={`mt-0.5 text-xs ${m.lastLoginAt ? "text-ok" : "text-muted"}`}>{timeAgo(m.lastLoginAt)}</p>
      </div>
      <div className="flex max-w-md flex-wrap gap-1.5">
        {m.role === "admin" ? (
          <span className="rounded-full bg-[rgba(94,225,255,0.12)] px-2.5 py-1 text-xs text-accent-2">Semua map</span>
        ) : m.mapIds.length === 0 ? (
          <span className="rounded-full bg-[rgba(255,204,102,0.12)] px-2.5 py-1 text-xs text-warn">Belum ada map</span>
        ) : (
          m.mapIds.map((id) => (
            <span key={id} className="rounded-full bg-panel-strong px-2.5 py-1 text-xs">
              {mapName.get(id) ?? `#${id}`}
            </span>
          ))
        )}
      </div>
      {!isSelf && (
        <div className="flex gap-2">
          <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={onEdit}>
            Ubah
          </button>
          <button className="btn btn-danger px-3 py-1.5 text-sm" onClick={onRemove}>
            Cabut
          </button>
        </div>
      )}
    </div>
  );
}

function MemberForm({
  title,
  initial,
  maps,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  initial: Draft;
  maps: MapOption[];
  submitLabel: string;
  onSubmit: (d: Draft) => Promise<string | null>;
  onCancel: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const toggleMap = (id: number) =>
    set({ mapIds: d.mapIds.includes(id) ? d.mapIds.filter((x) => x !== id) : [...d.mapIds, id] });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await onSubmit({ ...d, discordId: d.discordId.replace(/\D/g, "") });
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="rise glass space-y-5 rounded-3xl border-[rgba(179,140,255,0.35)] p-6">
      <h3 className="text-lg font-semibold">{title}</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 sm:col-span-2">
          <span className="text-xs text-muted">Nama (klien / staf)</span>
          <input className="input" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="mis. Nama klien" autoFocus />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted">Discord ID</span>
          <input
            className="input font-mono"
            inputMode="numeric"
            value={d.discordId}
            onChange={(e) => set({ discordId: e.target.value.replace(/\D/g, "") })}
            placeholder="mis. 123456789012345678"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted">Email Google</span>
          <input className="input" type="email" value={d.email} onChange={(e) => set({ email: e.target.value })} placeholder="nama@gmail.com" />
        </label>
        <p className="text-xs text-muted sm:col-span-2">
          Isi salah satu atau dua-duanya. Orang yang belum terdaftar bisa menyalin Discord ID / email-nya dari halaman
          “akses eksklusif” setelah mencoba login.
        </p>
      </div>

      <div className="space-y-2">
        <span className="text-xs text-muted">Peran</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              { v: "client", t: "Klien", b: "Hanya map yang dicentang di bawah. Bisa kelola dance." },
              { v: "admin", t: "Admin studio", b: "Staf OnBlox: semua map, kunci API, dan menu Akses." },
            ] as const
          ).map((o) => (
            <button
              type="button"
              key={o.v}
              onClick={() => set({ role: o.v })}
              className={`rounded-2xl border p-4 text-left transition ${
                d.role === o.v ? "border-accent bg-[rgba(179,140,255,0.1)]" : "border-line hover:border-[rgba(255,255,255,0.2)]"
              }`}
            >
              <p className="font-medium">{o.t}</p>
              <p className="mt-0.5 text-xs text-muted">{o.b}</p>
            </button>
          ))}
        </div>
      </div>

      {d.role === "client" && (
        <div className="space-y-2">
          <span className="text-xs text-muted">Map yang bisa dibuka</span>
          {maps.length === 0 ? (
            <p className="text-sm text-muted">Belum ada map. Buat map dulu di menu Map.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {maps.map((m) => {
                const on = d.mapIds.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggleMap(m.id)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      on ? "border-accent bg-[rgba(179,140,255,0.15)] text-text" : "border-line text-muted hover:text-text"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy || !d.name.trim() || (!d.email.trim() && !d.discordId.trim())}>
          {busy ? "Menyimpan…" : submitLabel}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  );
}
