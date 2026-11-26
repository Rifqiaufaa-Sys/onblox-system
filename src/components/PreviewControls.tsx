"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

async function setPreview(target: "guest" | number | null) {
  const res = await fetch("/api/admin/preview", {
    method: target === null ? "DELETE" : "POST",
    headers: { "content-type": "application/json" },
    body: target === null ? undefined : JSON.stringify({ target }),
  });
  return res.ok;
}

/** Tombol "Lihat sebagai …" (dipakai di menu Akses). */
export function PreviewButton({
  target,
  label = "Lihat sebagai",
  className = "btn btn-ghost px-3 py-1.5 text-sm",
}: {
  target: "guest" | number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        if (await setPreview(target)) {
          router.push("/dashboard");
          router.refresh();
        }
        setBusy(false);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      {busy ? "Membuka…" : label}
    </button>
  );
}

/** Banner di atas semua halaman selama mode pratinjau aktif. */
export function PreviewBanner({ label }: { label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <div className="border-b border-[rgba(255,204,102,0.35)] bg-[rgba(255,204,102,0.1)]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <p className="text-warn">
          <span className="font-semibold">Mode pratinjau</span> · kamu melihat sebagai{" "}
          <span className="font-semibold text-text">{label}</span>
          <span className="hidden text-muted md:inline"> — tampilan saja, hak akses aslimu tidak berubah.</span>
        </p>
        <button
          className="btn btn-ghost px-3 py-1 text-xs"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await setPreview(null);
            router.push("/dashboard/akses");
            router.refresh();
          }}
        >
          {busy ? "Keluar…" : "Keluar pratinjau"}
        </button>
      </div>
    </div>
  );
}
