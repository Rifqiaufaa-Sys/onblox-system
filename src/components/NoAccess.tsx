import type { Session } from "@/lib/auth";
import { discordIdOf } from "@/lib/access";
import CopyButton from "./CopyButton";
import LogoutButton from "@/app/dashboard/LogoutButton";

const STUDIO_URL = "https://www.onbloxstudio.com";

const PERKS = [
  { title: "Update tanpa publish", body: "Dance, lagu, dan konten map berubah langsung di server yang lagi jalan." },
  { title: "Panel milik kamu", body: "Map hasil commission kamu muncul di sini, cuma kamu dan tim yang bisa buka." },
  { title: "Dikerjakan tim OnBlox", body: "Sistem dipasang dan dirawat langsung oleh OnBlox Studio." },
];

/** Tampil untuk orang yang berhasil login tapi belum terdaftar sebagai member. */
export default function NoAccess({ session }: { session: Session }) {
  const discordId = discordIdOf(session);
  const idLabel = discordId ? "Discord ID" : session.email ? "Email" : null;
  const idValue = discordId ?? session.email;

  return (
    <div className="mx-auto max-w-3xl">
      <section className="rise glass relative overflow-hidden rounded-[2rem] p-8 sm:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
        />
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Akses eksklusif
        </span>

        <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Hai {session.name}, OnBlox System{" "}
          <span className="bg-linear-to-r from-accent to-accent-2 bg-clip-text text-transparent">
            khusus klien OnBlox Studio.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-muted">
          Akun kamu berhasil masuk, tapi belum terdaftar. Panel ini cuma dibuka untuk klien yang commission map atau
          sistem Roblox di OnBlox Studio.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href={STUDIO_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Commission di OnBlox Studio →
          </a>
          <LogoutButton label="Ganti akun" />
        </div>
      </section>

      {idValue && (
        <section className="rise glass mt-4 rounded-3xl p-6" style={{ animationDelay: "0.05s" }}>
          <h2 className="font-semibold">Sudah commission?</h2>
          <p className="mt-1 text-sm text-muted">
            Kirim {idLabel} di bawah ke tim OnBlox (Discord atau chat commission kamu). Begitu ditambahkan, refresh
            halaman ini dan map kamu langsung muncul.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-line bg-[rgba(0,0,0,0.35)] p-2 pl-4">
            <span className="text-xs text-muted">{idLabel}</span>
            <code className="flex-1 truncate font-mono text-sm">{idValue}</code>
            <CopyButton value={idValue} />
          </div>
        </section>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {PERKS.map((p, i) => (
          <div key={p.title} className="rise glass rounded-3xl p-5" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <h3 className="text-sm font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted">{p.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
