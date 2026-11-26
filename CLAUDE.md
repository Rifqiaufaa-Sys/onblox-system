@AGENTS.md

# OnBlox System — catatan untuk AI (Claude Code)

Baca ini dulu sebelum mengubah apa pun. Bahasa kerja: **Bahasa Indonesia** (UI, komentar, pesan commit
boleh campur Inggris untuk istilah teknis).

## Siapa & untuk apa

- Pemilik: **Rifqiaufaa** (GitHub `Rifqiaufaa-Sys`, Roblox `OBLX_Graypolea`), builder map Roblox.
- **OnBlox Studio** = studio/brand miliknya yang menerima **commission** map & sistem Roblox.
  Website resmi: **onbloxstudio.com** (project Vercel terpisah: `onblox-studio` / `onbloxstudios`,
  sudah punya login Google). Project ini BUKAN website itu.
- **OnBlox System** (repo ini) = panel/website untuk mengelola konten **di dalam game** klien/map,
  tanpa harus publish ulang map. Rencana domain: **subdomain** dari onbloxstudio.com,
  mis. `system.onbloxstudio.com`.
- Sistem in-game milik pemilik bernama **Graypolea** (GraypoleaDance, GraypoleaMusic, GrayOverhead, dll),
  dipakai ulang di beberapa map: **Sepetak Club** (map pertama yang memakai OnBlox System), **ILLUZION**, dll.
- Pola serupa sudah ada: donasi live (`onblox-donation-api-cash-donate.vercel.app`) dan
  GraypoleaMusic `Settings.Website` (lagu via website).

## Fitur v1 (sudah jadi)

- Landing page dengan background 3D (React Three Fiber) — `src/app/page.tsx`, `src/components/Hero3D.tsx`.
- Login: **Google + Discord** (OAuth 2 + PKCE, tanpa library, `src/lib/oauth.ts`, route
  `/api/auth/signin/[provider]` → `/api/auth/callback/[provider]`). Password `ADMIN_PASSWORD` opsional.
  Sesi = JWT berisi identitas saja (`src/lib/auth.ts`).
- **Akses per map** (`src/lib/access.ts`, dihitung ulang tiap request): owner (env `ALLOWED_EMAILS` /
  `ALLOWED_DISCORD_IDS`), admin studio & klien (tabel `members` + `map_access`, dikelola di
  `/dashboard/akses`), tamu = halaman akses eksklusif (`NoAccess`) dengan ajakan commission.
  Klien hanya melihat map miliknya, tanpa panel kunci API. Map yang tidak boleh dibuka → 404.
- Tabel `accounts` = semua yang pernah login (diisi di OAuth callback) → "Permintaan akses" di menu Akses.
- Mode pratinjau ("Lihat sebagai"): cookie `onblox_preview`, hanya dihormati kalau hak ASLI = owner/admin,
  dan hanya memengaruhi `getAccess()` (halaman). API selalu pakai `accessFor()` = hak asli.
- `maps.last_sync_at` diisi oleh API game (maks 1×/menit) → status "Game online" + checklist "Mulai di sini".
- Panel "Sambungan ke game" membaca `roblox/OnBloxDances.server.lua` saat render (lihat
  `outputFileTracingIncludes` di `next.config.ts`), jadi file itu satu-satunya sumber script.
- Mobile: grid pakai `grid-cols-1` + `min-w-0` (blok `<pre>` panjang bisa melebarkan kolom grid).
- Dashboard: daftar **map** (tiap map punya slug + kunci API sendiri; yang disimpan hanya hash-nya).
- Kelola **dance** per map: paste banyak ID sekaligus (format bebas, lihat `parseDanceList`),
  nama otomatis dari katalog Roblox (`economy.roblox.com/v2/assets/<id>/details`, AssetTypeId 24/61),
  tolak yang bukan animasi, lewati duplikat, ganti nama, pindah kategori Dance/Pose, hapus.
- API untuk game: `GET /api/v1/maps/<slug>/dances` + header `x-onblox-key`, opsional `?since=<version>`
  → `{ changed:false }` kalau tidak ada perubahan. Bentuk balasan: lihat README.
- Script Roblox: `roblox/OnBloxDances.server.lua` (polling tiap 60 dtk → `ReplicatedStorage.OnBlox.Dances`
  StringValue JSON + atribut `Version`).

## Stack & aturan teknis (PENTING)

- **Next.js 16** App Router + TypeScript + Tailwind CSS 4 (plugin `@tailwindcss/turbopack`, tanpa postcss).
  Baca `node_modules/next/dist/docs/` sebelum menulis kode Next — banyak API berubah:
  - `params` di page/route adalah **Promise** (`const { slug } = await params`).
  - Tipe global `PageProps<"/route">`, `LayoutProps<"/route">`, `RouteContext<"/route">`
    (dibuat oleh `next typegen` / `next build`).
  - `cacheComponents: true` aktif: akses `cookies()`, `headers()`, atau DB di luar `<Suspense>` membuat
    build gagal ("uncached or runtime data during prerendering"). Bungkus komponen dinamis dengan Suspense
    (lihat `src/app/dashboard/layout.tsx`, `src/app/login/page.tsx`).
  - File `layout.tsx`/`page.tsx` jangan mengekspor komponen tambahan; taruh di `src/components/`.
  - **Auth: tiap `page.tsx` di dashboard wajib cek `getAccess()` sendiri** (lihat page yang ada). Cek di
    layout tidak cukup — page dirender paralel dan datanya ikut terkirim di RSC payload walau layout redirect.
    Route handler admin pakai `requireMember()` / `requireStaff()` / `requireMap(slug)`.
- Font: paket **`geist`** lokal (bukan `next/font/google`) supaya build tidak butuh akses Google Fonts.
- Database: **Neon Postgres** via `@neondatabase/serverless` (`src/lib/db.ts`). Tabel dibuat otomatis oleh
  `ensureSchema()` (maps, dances). Tidak ada ORM/migrasi; ubah skema dengan `ALTER TABLE ... IF NOT EXISTS`
  di `ensureSchema`.
- Validasi input pakai **zod**; sesi pakai **jose**.
- Lint: `react-hooks/set-state-in-effect` aktif — muat data awal di server component, jangan `useEffect(load)`.
- Sebelum commit: `npm run lint` dan `npm run build` harus lolos.

## Environment variables

| Nama | Isi |
| --- | --- |
| `DATABASE_URL` | dari Vercel → Storage → Neon (otomatis) |
| `SESSION_SECRET` | string acak ≥ 32 karakter |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth client Google (boleh pakai client yang sama dengan onbloxstudio.com) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | aplikasi Discord "Gravely" (sama dengan onbloxstudio.com) |
| `ALLOWED_EMAILS` / `ALLOWED_DISCORD_IDS` | owner, dipisah koma (member lain lewat menu Akses) |
| `ADMIN_PASSWORD` | opsional, password cadangan |

Redirect URI per domain: `https://<domain>/api/auth/callback/google` dan `.../discord`.

Jangan pernah commit `.env*` (kecuali `.env.example`).

## Deploy

- Vercel project: **onblox-system** (tim `five11you-8164's projects`, Hobby). Framework preset **Next.js**.
- Push ke `main` = deploy production.
- Subdomain: Vercel → project → Settings → **Domains** → tambah `system.onbloxstudio.com`.
  Kalau DNS onbloxstudio.com dikelola Vercel, langsung aktif; kalau di registrar lain, tambah record
  **CNAME** `system` → `cname.vercel-dns.com`.

## Status sambungan ke game (BELUM selesai)

Di Sepetak Club (Roblox Studio), dance bawaan ada di `ReplicatedStorage.GraypoleaDance.Internals.animations`
(ModuleScript, ±632 entri `{ name, animationId, category }`). Server: `ServerScriptService.GraypoleaDance.animation_system`.
Client: `StarterPlayerScripts.GraypoleaDance.EmoteGui` (membaca modul langsung).
Langkah berikutnya: pasang `OnBloxDances` + `Config` di game, lalu ubah `animation_system` (izinkan ID dari
website) dan `EmoteGui` (gabungkan daftar dari `ReplicatedStorage.OnBlox.Dances`, dengarkan atribut `Version`).
Dance dari modul tetap jalan; website hanya menambah.

## Roadmap

1. Sambungkan dance website ↔ GraypoleaDance (di atas).
2. ~~Login Google/Discord + akses per map~~ (sudah). Berikutnya mungkin: Login with Roblox, SSO dengan
   onbloxstudio.com lewat cookie `.onbloxstudio.com`.
3. Multi-klien: tiap commission/map klien punya ruang sendiri.
4. Modul lain lewat pola yang sama: lagu (GraypoleaMusic), title, pengumuman.

## Tes lokal tanpa Neon

Tidak ada Postgres di PC ini. Untuk tes end-to-end dipakai server tiruan Neon HTTP di atas PGlite
(di luar repo), lalu `next start` dengan `DATABASE_URL=postgresql://u:p@localhost/db` dan
`NEON_FETCH_ENDPOINT=http://localhost:<port>/sql` (hook di `src/lib/db.ts`). Mock harus mengirim nilai
sebagai teks Postgres (array `{1,2}`, tanggal ISO). Setelah mock di-reset, restart `next start` juga
(`ensureSchema` di-cache per proses).
