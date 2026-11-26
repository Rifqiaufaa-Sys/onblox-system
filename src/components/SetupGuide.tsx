import Link from "next/link";

export type GuideState = {
  maps: number;
  synced: boolean;
  dances: number;
  clients: number;
  pending: number;
  firstMapSlug: string | null;
};

/** Panduan "Mulai di sini" untuk owner/admin studio. Tiap langkah tercentang otomatis dari data. */
export default function SetupGuide({ s }: { s: GuideState }) {
  const steps = [
    {
      done: s.maps > 0,
      title: "Buat map",
      body: "Satu map = satu game klien. Klik “Tambah map” di bawah, simpan kunci API yang muncul (cuma tampil sekali).",
      href: null as string | null,
      cta: null as string | null,
    },
    {
      done: s.synced,
      title: "Pasang di game",
      body: "Buka map → panel “Sambungan ke game”. Salin Config + script ke Roblox Studio, nyalakan Allow HTTP Requests, lalu publish map sekali ini saja.",
      href: s.firstMapSlug ? `/dashboard/${s.firstMapSlug}` : null,
      cta: "Buka map",
    },
    {
      done: s.dances > 0,
      title: "Tambah dance",
      body: "Paste ID animasi di halaman map. Tidak ada tombol publish: dance otomatis muncul di menu Emote dalam ±1 menit.",
      href: s.firstMapSlug ? `/dashboard/${s.firstMapSlug}` : null,
      cta: "Tambah dance",
    },
    {
      done: s.clients > 0,
      title: "Bagikan ke klien",
      body:
        s.pending > 0
          ? `${s.pending} orang sudah login dan menunggu akses. Buka Akses → “Beri akses”, centang map-nya.`
          : "Minta klien login di sini dengan Discord/Google. Dia muncul di Akses → Permintaan akses, lalu klik “Beri akses”.",
      href: "/dashboard/akses",
      cta: s.pending > 0 ? `Lihat ${s.pending} permintaan` : "Buka Akses",
    },
  ];
  const done = steps.filter((x) => x.done).length;
  const next = steps.findIndex((x) => !x.done);

  return (
    <details className="rise glass group rounded-3xl p-6" open={done < steps.length}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{done < steps.length ? "Mulai di sini" : "Panduan singkat"}</h2>
          <p className="text-sm text-muted">
            {done < steps.length ? `${done} dari ${steps.length} langkah selesai` : "Semua langkah sudah selesai ✓"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-panel-strong">
            <div
              className="h-full rounded-full bg-linear-to-r from-accent to-accent-2"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted transition group-open:rotate-180">▾</span>
        </div>
      </summary>

      <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className={`rounded-2xl border p-4 ${
              i === next ? "border-[rgba(179,140,255,0.5)] bg-[rgba(179,140,255,0.07)]" : "border-line"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done ? "bg-ok text-[#0b0913]" : i === next ? "bg-accent text-[#0b0913]" : "bg-panel-strong text-muted"
                }`}
              >
                {step.done ? "✓" : i + 1}
              </span>
              <h3 className={`font-medium ${step.done ? "text-muted line-through decoration-1" : ""}`}>{step.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted">{step.body}</p>
            {!step.done && step.href && step.cta && (
              <Link href={step.href} className="mt-3 inline-block text-sm text-accent hover:underline">
                {step.cta} →
              </Link>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
