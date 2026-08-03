# One Dashboard (onedashboard)

> **Catatan untuk AI/Claude Code:** jangan mengubah isi file `CLAUDE.md` ini. Kalau ada informasi yang perlu diperbarui, tanyakan dulu ke pemilik repo.

Monorepo untuk platform Ternak Properti: dashboard sales/CRM, seminar/produk, follow-up WhatsApp otomatis, dan landing page publik.

## Struktur repo

```
backend/       Laravel (API, migrations, artisan commands)
frontend-tp/   Next.js (dashboard internal + landing page publik)
```

Repo ini gabungan dari dua repo terpisah (`one_dashboard_api` dan `frontend-tp`) yang di-merge jadi satu monorepo dengan histori commit tetap dipertahankan.

## Setup lokal

```
cd backend && composer install
cd frontend-tp && npm install
```

`backend/.env` dan `frontend-tp/.env` **tidak ada di git** (sengaja, berisi kredensial asli). Minta ke pemilik repo lewat jalur aman (password manager), jangan lewat chat teks polos.

## Database

PostgreSQL. `.env` bisa diarahkan ke DB lokal atau langsung ke DB server produksi (`DB_HOST` di server EC2) — saat ini praktik yang berjalan adalah konek langsung ke DB server dari lokal untuk kebutuhan admin/scripting. Hati-hati: ini database produksi yang sama yang dipakai aplikasi live.

**Gotcha penting:** Banyak baris di `php artisan migrate:status` berstatus "Pending" karena DB awalnya dibuat dari import SQL dump, bukan lewat `artisan migrate`. **Jangan jalankan `php artisan migrate` polos** — itu akan mencoba menjalankan semua migration lama yang berpotensi bentrok dengan tabel yang sudah ada. Kalau perlu menjalankan migration baru, gunakan scoped path:
```
php artisan migrate --path=database/migrations/nama_file_migration.php
```

**Nama tabel yang sering salah tulis:** `produk_jadwal` (bukan `jadwal_produk`).

**Konvensi status:** kolom `status` di banyak tabel (`produk`, `template_follup`, dll) pakai `'N'` untuk menandai tidak aktif/terhapus. Query yang benar biasanya `where('status', '!=', 'N')`, bukan asumsi nilai lain.

**Perubahan data massal:** kalau perlu update/insert data dalam jumlah banyak langsung ke DB (bukan lewat UI), selalu backup baris yang akan diubah dulu (`\copy ... TO file.csv`) sebelum eksekusi. Jangan jalankan script sekali-pakai tanpa jejak — commit sebagai Artisan command kalau kemungkinan akan dipakai ulang.

## Deploy

**Frontend (Next.js):** build **selalu di lokal**, lalu upload hasil build ke server. **Jangan** `git pull` + build langsung di server EC2 — instance-nya kecil, build Next.js bisa bikin OOM dan mengganggu service lain yang jalan di server yang sama (backend, WhatsApp bot, dll).

**Backend (Laravel):** deploy dilakukan dengan **menyalin file**, bukan `git pull` di web root. Server punya deploy key khusus (read-only, terpisah dari akun GitHub pribadi) untuk fetch dari repo ini.

Lokasi di server: `/var/www/backend` (Laravel), `/var/www/frontend` (Next.js), `/var/www/wa-baileys` (WhatsApp service).

**Penting — `/var/www/backend` bukan repo git.** Direktori itu web root murni; `.git`-nya dinonaktifkan 3 Agustus 2026 (dipindah ke `/home/ubuntu/backend-dotgit-nonaktif-20260803`, arsip lengkap di `/home/ubuntu/backend-git-arsip-20260803.tar.gz`). Sebelumnya di sana ada checkout basi repo lama `one_dashboard_api` yang HEAD-nya berhenti di Januari 2026, sementara kode produksi sudah tujuh bulan lebih maju — sehingga `git checkout .`, `git reset --hard`, `git stash`, `git clean -fd`, atau `git pull` di direktori itu akan menghapus kode produksi. Jangan hidupkan lagi.

Sumber kode di server ada di clone terpisah: **`/home/ubuntu/onedashboard-src`** (clone bersih monorepo ini).

Langkah deploy backend:
```
cd /home/ubuntu/onedashboard-src && git pull            # sumber, bukan web root
cp backend/<path-file> /var/www/backend/<path-file>     # salin file yang berubah
cd /var/www/backend
php -l <path-file>                                       # cek syntax dulu
composer install --no-dev --optimize-autoloader          # kalau ada perubahan dependency
php artisan migrate --path=database/migrations/<file> --force   # kalau ada migration baru, scoped
php artisan config:cache && php artisan route:cache
```
Selalu backup file yang akan ditimpa di server dulu sebelum deploy, dan verifikasi endpoint terkait setelah deploy (jangan asumsikan "gak ada error syntax" berarti "berfungsi benar").

**Sebelum menimpa file, pastikan isinya masih sama dengan `main` versi sebelum perubahan Anda.** Kalau berbeda, berarti ada yang men-deploy sesuatu yang belum masuk `main` — hentikan dan telusuri dulu, jangan ditimpa.

**Deploy bisa bentrok.** Beberapa orang pernah men-deploy ke server yang sama dalam rentang menit yang sama. Kabari dulu di grup sebelum mulai, dan setelah selesai cek ulang bahwa perubahan Anda masih ada di file (bukan cuma "tadi sudah saya salin").

Rencana memindahkan deploy backend ke jalur git sungguhan (`git pull` = deploy, rollback via git) ada di [`docs/rencana-deploy-backend-git-native.md`](docs/rencana-deploy-backend-git-native.md) — belum dikerjakan.

## Git workflow

- **Jangan push langsung ke `main`.** Semua perubahan lewat branch + Pull Request.
- Merge ke `main` di-review dulu (untuk sekarang oleh pemilik repo), karena `main` terhubung ke jalur deploy produksi.
- Sebelum mulai kerja, `git pull` (atau checkout branch orang lain kalau mau lanjutkan kerjaan yang belum di-merge).
- **Semua pesan commit ditulis dalam Bahasa Indonesia** (termasuk yang dibuat AI/Claude Code).

## Yang perlu diingat soal keamanan

- `.env`, `next.zip`, dan file build lain sudah di-gitignore — jangan pernah `git add` file-file ini.
- Repo ini **private**. Jangan asumsikan public.
- Kalau perlu akses server (SSH), pakai deploy key khusus per keperluan, bukan share private key pribadi.
