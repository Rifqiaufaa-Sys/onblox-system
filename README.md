# OnBlox System

Website untuk mengelola konten map Roblox (mulai dari **dance**) tanpa publish ulang map.
Masukkan ID animasi di dashboard → nama diambil otomatis dari Roblox → server game mengambil
daftar terbaru lewat HTTP.

Dibuat dengan Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Three.js (React Three Fiber) ·
Neon Postgres · deploy di Vercel.

## Deploy ke Vercel (gratis)

1. **Import repo**: vercel.com → Add New → Project → pilih repo `onblox-system` → Deploy
   (deploy pertama boleh gagal/menampilkan "Setup belum lengkap", itu normal).
2. **Database**: di project Vercel → **Storage** → Create Database → **Neon** (Free) → Connect ke project ini.
   `DATABASE_URL` akan terisi otomatis.
3. **Environment Variables** (Settings → Environment Variables):
   - `ADMIN_PASSWORD` — password masuk dashboard
   - `SESSION_SECRET` — string acak minimal 32 karakter
4. **Redeploy** (Deployments → ⋯ → Redeploy). Tabel database dibuat otomatis saat pertama dipakai.

## Pakai

1. Buka `https://<project>.vercel.app/dashboard`, masuk dengan `ADMIN_PASSWORD`.
2. **Tambah map** (mis. `Sepetak Club`, slug `sepetak`). Simpan **kunci API** yang muncul (hanya tampil sekali).
3. Di halaman map, paste ID animasi. Format yang diterima (satu per baris):
   ```
   128964914252376
   rbxassetid://128964914252376
   Two Groove : rbxassetid://128964914252376
   Two Groove = rbxassetid://128964914252376
   ```
   Nama yang ditulis dipakai apa adanya; kalau tidak ditulis, nama diambil dari Roblox.
   ID yang bukan animasi otomatis ditolak, ID yang sudah ada dilewati.

## Sambungkan ke game Roblox

1. Game Settings → Security → **Allow HTTP Requests = ON**.
2. Di `ServerScriptService`, buat Folder `OnBlox` berisi:
   - `Config` (ModuleScript) — salin dari panel **Sambungan ke game** di dashboard.
   - `OnBloxDances` (Script) — isi dari [`roblox/OnBloxDances.server.lua`](roblox/OnBloxDances.server.lua).
3. Daftar dance tersedia di `ReplicatedStorage.OnBlox.Dances` (JSON) untuk sistem dance (GraypoleaDance).

## API untuk game

```
GET /api/v1/maps/<slug>/dances
Header: x-onblox-key: <kunci API map>
Query (opsional): ?since=<version>  → { changed: false } kalau tidak ada perubahan
```

Balasan:

```json
{
  "changed": true,
  "map": "sepetak",
  "version": "1764200000000",
  "count": 2,
  "dances": [{ "name": "Two Groove", "animationId": "rbxassetid://128964914252376", "category": "Dance" }]
}
```

## Development

```bash
cp .env.example .env.local   # isi nilainya
npm install
npm run dev
```

## Rencana berikutnya

- Login dengan akun Roblox (OAuth) dan akses per map untuk tiap staf.
- Fitur lain lewat pola yang sama: lagu (GraypoleaMusic), title, dll.
