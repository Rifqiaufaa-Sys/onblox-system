import { redirect } from "next/navigation";
import { getSession, passwordLoginEnabled } from "@/lib/auth";
import { enabledProviders, type ProviderId } from "@/lib/oauth";
import { ownerConfigured } from "@/lib/access";
import LoginForm from "@/app/login/LoginForm";

const ERRORS: Record<string, string> = {
  cancelled: "Login dibatalkan.",
  state: "Sesi login kedaluwarsa. Coba lagi.",
  token: "Gagal menghubungi Google/Discord. Coba lagi, atau cek Client ID & Secret.",
  provider: "Metode login ini belum diaktifkan.",
  config: "Setup server belum lengkap (SESSION_SECRET).",
};

/** Bagian dinamis halaman login (baca cookie + query), dirender di dalam Suspense. */
export default async function LoginOptions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getSession().catch(() => null);
  if (session) redirect("/dashboard");

  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? "Gagal masuk.") : null;
  const providers = enabledProviders();
  const password = passwordLoginEnabled();

  return (
    <div className="mt-6 space-y-3">
      {message && (
        <p className="rounded-xl border border-[rgba(255,107,129,0.35)] bg-[rgba(255,107,129,0.08)] px-3 py-2 text-sm text-bad">
          {message}
        </p>
      )}

      {providers.map((p) => (
        <a key={p.id} href={`/api/auth/signin/${p.id}`} className="btn btn-ghost w-full">
          <ProviderIcon id={p.id} />
          Masuk dengan {p.label}
        </a>
      ))}

      {providers.length > 0 && !ownerConfigured() && (
        <p className="text-xs text-warn">
          Owner belum di-set: isi <code>ALLOWED_EMAILS</code> / <code>ALLOWED_DISCORD_IDS</code> di Vercel.
        </p>
      )}

      <p className="pt-2 text-center text-xs text-muted">
        Khusus klien & tim{" "}
        <a href="https://www.onbloxstudio.com" target="_blank" rel="noopener noreferrer" className="text-text hover:text-accent">
          OnBlox Studio
        </a>
        .
      </p>

      {password && (
        <details className="group pt-1" open={providers.length === 0}>
          <summary className="cursor-pointer list-none text-center text-xs text-muted hover:text-text">
            {providers.length > 0 ? "atau masuk dengan password admin" : "Password admin"}
          </summary>
          <LoginForm />
        </details>
      )}

      {providers.length === 0 && !password && (
        <p className="text-sm text-muted">
          Belum ada cara masuk yang aktif. Isi <code>GOOGLE_CLIENT_ID</code>/<code>GOOGLE_CLIENT_SECRET</code>,{" "}
          <code>DISCORD_CLIENT_ID</code>/<code>DISCORD_CLIENT_SECRET</code>, atau <code>ADMIN_PASSWORD</code> di Vercel. Lihat README.
        </p>
      )}
    </div>
  );
}

function ProviderIcon({ id }: { id: ProviderId }) {
  if (id === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#5865F2"
        d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.7-3.6-13.7ZM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"
      />
    </svg>
  );
}
