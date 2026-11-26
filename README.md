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
   - `SESSION_SECRET` — string acak minimal 32 karakter
   - Login Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
   - Login Discord: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
   - Owner: `ALLOWED_EMAILS` (email Google/Discord terverifikasi) dan/atau `ALLOWED_DISCORD_IDS`,
     dipisah koma. Owner punya akses penuh dan tidak bisa terkunci dari dashboard.
   - Opsional: `ADMIN_PASSWORD` — password cadangan (kosongkan untuk mematikan)
4. **Redeploy** (Deployments → ⋯ → Redeploy). Tabel database dibuat otomatis saat pertama dipakai.

### Daftarkan redirect URI

Untuk tiap domain yang dipakai (mis. `onblox-system.vercel.app` dan `system.onbloxstudio.com`):

- **Google Cloud Console** → APIs & Services → Credentials → OAuth client (Web application) →
  *Authorized redirect URIs*: `https://<domain>/api/auth/callback/google`
- **Discord Developer Portal** → aplikasi → OAuth2 → *Redirects*: `https://<domain>/api/auth/callback/discord`.
  Matikan **Public Client** (website ini memakai Client Secret di server).

Kalau login gagal, alasan aslinya tercatat di Vercel → Logs (cari `[oauth:`), mis. `invalid_client` = secret salah.

## Akses

| Peran | Diatur di | Bisa apa |
| --- | --- | --- |
| Owner | env `ALLOWED_*` | semua |
| Admin studio | dashboard → **Akses** | semua map, kunci API, kelola akses |
| Klien | dashboard → **Akses** | hanya map yang dibagikan, kelola dance |
| Tamu | (login tapi belum terdaftar) | halaman "akses eksklusif" + ajakan commission |

Orang yang belum terdaftar bisa menyalin Discord ID / email-nya dari halaman akses eksklusif lalu
mengirimkannya ke tim OnBlox. Mencabut akses langsung berlaku (hak akses dicek ulang tiap request).

## Pakai

1. Buka `https://<project>.vercel.app/dashboard`, masuk dengan Google/Discord (atau password cadangan).
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

- Login dengan akun Roblox (OAuth) dan akses per map untuk tiap staf (role owner / admin map).
- Fitur lain lewat pola yang sama: lagu (GraypoleaMusic), title, dll.
