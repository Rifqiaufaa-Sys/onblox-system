"use client";

import { useState } from "react";

/** Menampilkan kunci API sekali saja, dengan tombol salin. */
export function KeyReveal({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 rounded-2xl border border-[rgba(255,204,102,0.35)] bg-[rgba(255,204,102,0.06)] p-4">
      <p className="text-sm text-warn">Simpan kunci API ini sekarang. Kunci hanya ditampilkan sekali.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-xl bg-black/40 px-3 py-2 font-mono text-sm">{apiKey}</code>
        <button
          className="btn btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}
