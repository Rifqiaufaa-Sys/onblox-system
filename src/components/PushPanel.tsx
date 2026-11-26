"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type PushInfo = {
  universeId: string | null;
  keyHint: string | null;
  lastAgeSeconds: number | null;
  error: string | null;
};

function ago(s: number) {
  const m = s / 60;
  return m < 1 ? "barusan" : m < 60 ? `${Math.floor(m)} mnt lalu` : m < 1440 ? `${Math.floor(m / 60)} jam lalu` : `${Math.floor(m / 1440)} hari lalu`;
}

/**
 * Pengaturan "Sinyal instan": website memberi tahu semua server game yang sedang jalan setiap kali
 * daftar dance berubah (Open Cloud MessagingService), jadi tidak menunggu cek berkala 5 menit.
 */
export default function PushPanel({ slug, info, placeHint }: { slug: string; info: PushInfo; placeHint?: string }) {
  const router = useRouter();
  const active = Boolean(info.universeId && info.keyHint);
  const [open, setOpen] = useState(!active);
  const [game, setGame] = useState(info.universeId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<null | "save" | "send" | "off">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const api = `/api/admin/maps/${slug}/cloud`;

  async function call(kind: "save" | "send" | "off") {
    if (kind === "off" && !confirm("Matikan sinyal instan? Game tetap update lewat cek tiap 5 menit.")) return;
    setBusy(kind);
    setMsg(null);
    const res = await fetch(api, {
      method: kind === "save" ? "PUT" : kind === "send" ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: kind === "save" ? JSON.stringify({ game, apiKey: apiKey || undefined }) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Gagal" });
    setApiKey("");
    setMsg({
      ok: true,
      text:
        kind === "save"
          ? "Tersimpan & sinyal tes berhasil dikirim ✓"
          : kind === "send"
            ? "Sinyal terkirim. Server yang online mengambil daftar dalam beberapa detik ✓"
            : "Sinyal instan dimatikan.",
    });
    if (kind === "save") setOpen(false);
    router.refresh();
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Sinyal instan</p>
          <p className="text-xs text-muted">
            {active
              ? "Setiap dance berubah, semua server yang online langsung mengambil daftar baru."
              : "Belum aktif: server yang online mengambil daftar baru tiap 5 menit."}
          </p>
        </div>
        {active ? (
          info.error ? (
            <span className="rounded-full bg-[rgba(255,107,129,0.12)] px-2.5 py-1 text-xs text-bad">● Gagal terakhir</span>
          ) : (
            <span className="rounded-full bg-[rgba(95,227,161,0.12)] px-2.5 py-1 text-xs text-ok">
              ● Aktif{info.lastAgeSeconds !== null ? ` · ${ago(info.lastAgeSeconds)}` : ""}
            </span>
          )
        ) : (
          <span className="rounded-full bg-panel-strong px-2.5 py-1 text-xs text-muted">○ Belum aktif</span>
        )}
      </div>

      {active && info.error && <p className="mt-2 text-xs text-bad">{info.error}</p>}

      {active && !open && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost px-3 py-1.5 text-xs" disabled={busy !== null} onClick={() => call("send")}>
            {busy === "send" ? "Mengirim…" : "Kirim sinyal sekarang"}
          </button>
          <button className="btn btn-ghost px-3 py-1.5 text-xs" onClick={() => setOpen(true)}>
            Ubah pengaturan
          </button>
        </div>
      )}

      {open && (
        <div className="mt-3 space-y-3">
          <details className="rounded-xl bg-black/25 p-3 text-xs text-muted" open={!active}>
            <summary className="cursor-pointer text-text">Cara bikin Open Cloud API key (sekali per game)</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4">
              <li>
                Buka <span className="text-text">create.roblox.com</span> → Dashboard → <b>Open Cloud</b> → <b>API Keys</b> →{" "}
                <b>Create API Key</b>.
              </li>
              <li>Nama bebas, mis. “OnBlox System”.</li>
              <li>
                Access Permissions → pilih <b>Messaging Service</b> → pilih game ini → centang operasi <b>publish</b>.
              </li>
              <li>
                Security → Accepted IP Addresses: tambah <code>0.0.0.0/0</code> (server website tidak punya IP tetap).
              </li>
              <li>Expiration: boleh tanpa kedaluwarsa. Save & Generate Key → salin key-nya ke bawah.</li>
            </ol>
          </details>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Universe ID atau Place ID game</span>
            <input
              className="input py-2 font-mono text-xs"
              value={game}
              onChange={(e) => setGame(e.target.value)}
              placeholder={placeHint ? `mis. ${placeHint}` : "mis. 116101599738784"}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs text-muted">Open Cloud API key</span>
            <input
              className="input py-2 font-mono text-xs"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={info.keyHint ? `tersimpan (${info.keyHint}), kosongkan untuk tetap memakai` : "tempel key di sini"}
            />
          </label>
          <p className="text-xs text-muted">Key disimpan terenkripsi dan tidak pernah ditampilkan lagi.</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary px-4 py-1.5 text-sm"
              disabled={busy !== null || game.trim().length < 5 || (!active && !apiKey.trim())}
              onClick={() => call("save")}
            >
              {busy === "save" ? "Mengetes…" : "Simpan & tes"}
            </button>
            {active && (
              <>
                <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setOpen(false)}>
                  Batal
                </button>
                <button className="btn btn-danger px-3 py-1.5 text-sm" disabled={busy !== null} onClick={() => call("off")}>
                  Matikan
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-ok" : "text-bad"}`}>{msg.text}</p>}
    </div>
  );
}
