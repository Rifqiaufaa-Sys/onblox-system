import Link from "next/link";
import Hero3D from "@/components/Hero3D";

const features = [
  { title: "Tempel ID, beres", body: "Paste satu atau puluhan ID animasi. Nama diambil otomatis dari Roblox." },
  { title: "Langsung ke game", body: "Server Roblox mengambil daftar terbaru lewat HTTP, tanpa publish ulang map." },
  { title: "Eksklusif untuk klien", body: "Tiap klien commission OnBlox Studio cuma melihat map miliknya sendiri." },
];

export default function Home() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <div className="absolute inset-0 -z-0 opacity-90">
        <Hero3D />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg)]" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-semibold tracking-tight">
          OnBlox<span className="text-accent">.</span>
        </span>
        <Link href="/dashboard" className="btn btn-ghost">
          Dashboard
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex max-w-6xl flex-col items-start px-6 pt-[18vh] pb-24">
        <p className="rise glass mb-6 rounded-full px-3 py-1 text-xs text-muted">OnBlox Studio · sistem konten map Roblox</p>
        <h1 className="rise text-gradient max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
          Tambah dance ke map kamu, dari mana saja.
        </h1>
        <p className="rise mt-6 max-w-xl text-lg text-muted" style={{ animationDelay: "0.1s" }}>
          Masukkan ID animasi di website, dan dance langsung muncul di menu Emote dalam game.
        </p>
        <div className="rise mt-10 flex gap-3" style={{ animationDelay: "0.2s" }}>
          <Link href="/dashboard" className="btn btn-primary">
            Masuk dashboard
          </Link>
          <a href="#cara" className="btn btn-ghost">
            Cara kerja
          </a>
        </div>
      </section>

      <section id="cara" className="relative z-10 mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.title} className="rise glass rounded-3xl p-6" style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
