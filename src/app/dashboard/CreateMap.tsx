"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeyReveal } from "@/components/KeyReveal";

export default function CreateMap() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; apiKey: string } | null>(null);

  function autoSlug(v: string) {
    return v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/maps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, placeId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Gagal membuat map");
    setCreated({ slug: data.map.slug, apiKey: data.apiKey });
    router.refresh();
  }

  if (created) {
    return (
      <div className="glass rounded-3xl p-6 sm:col-span-2 lg:col-span-3">
        <h2 className="text-lg font-semibold">Map dibuat ✓</h2>
        <KeyReveal apiKey={created.apiKey} />
        <div className="mt-4 flex gap-2">
          <button className="btn btn-primary" onClick={() => router.push(`/dashboard/${created.slug}`)}>
            Buka map
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setCreated(null);
              setOpen(false);
              setName("");
              setSlug("");
              setPlaceId("");
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-3xl border border-dashed border-line p-6 text-left text-muted transition hover:border-accent hover:text-text"
      >
        <span className="text-2xl">＋</span>
        <p className="mt-2 font-medium">Tambah map</p>
        <p className="text-sm">Map klien baru, lalu bagikan aksesnya di menu Akses</p>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass space-y-3 rounded-3xl p-6">
      <input
        className="input"
        placeholder="Nama map"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setSlug(autoSlug(e.target.value));
        }}
        autoFocus
      />
      <input className="input font-mono" placeholder="slug (huruf kecil, mis. nama-map)" value={slug} onChange={(e) => setSlug(autoSlug(e.target.value))} />
      <input className="input" placeholder="Place ID (opsional)" value={placeId} onChange={(e) => setPlaceId(e.target.value.replace(/\D/g, ""))} />
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy || name.length < 2 || slug.length < 3}>
          {busy ? "Membuat…" : "Buat"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Batal
        </button>
      </div>
    </form>
  );
}
