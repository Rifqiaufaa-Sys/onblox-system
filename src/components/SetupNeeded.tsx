export default function SetupNeeded({ message }: { message: string }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="glass max-w-lg rounded-3xl p-8">
        <h1 className="text-xl font-semibold">Setup belum lengkap</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        <p className="mt-4 text-sm text-muted">
          Atur Environment Variables di Vercel: <code>DATABASE_URL</code>, <code>ADMIN_PASSWORD</code>,{" "}
          <code>SESSION_SECRET</code>. Lihat README di repo.
        </p>
      </div>
    </main>
  );
}
