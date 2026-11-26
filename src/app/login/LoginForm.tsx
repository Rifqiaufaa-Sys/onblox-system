"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Gagal masuk");
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <input
        className="input"
        type="password"
        placeholder="Password admin"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-bad">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy || !password}>
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
