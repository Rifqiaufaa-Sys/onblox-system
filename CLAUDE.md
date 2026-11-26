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
- Login admin: satu password (`ADMIN_PASSWORD`) + sesi JWT di cookie (`src/lib/auth.ts`).
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
| `ADMIN_PASSWORD` | password dashboard |
| `SESSION_SECRET` | string acak ≥ 32 karakter |

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
2. Login seperti website utama (Google) dan/atau Login with Roblox (OAuth), dengan akses per map untuk
   staf/klien commission (role: owner, admin map).
3. Multi-klien: tiap commission/map klien punya ruang sendiri.
4. Modul lain lewat pola yang sama: lagu (GraypoleaMusic), title, pengumuman.
