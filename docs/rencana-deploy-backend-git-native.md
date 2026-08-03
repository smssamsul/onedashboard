# Rencana: pindahkan deploy backend ke jalur git sungguhan

Status: **belum dikerjakan**. Ditulis 3 Agustus 2026.

## Kenapa

Sekarang backend produksi di-deploy dengan menyalin file dari
`/home/ubuntu/onedashboard-src` ke `/var/www/backend`. Ini jalan dan aman, tapi
punya dua kelemahan:

- **Tidak ada rollback yang cepat.** Kalau deploy bermasalah, pemulihan
  bergantung pada backup file yang dibuat manual sebelum menimpa. Kalau backup
  terlupa, tidak ada jaring pengaman.
- **Tidak ada satu sumber kebenaran.** Tidak ada cara langsung menjawab
  "kode apa yang sedang jalan di produksi" selain membandingkan file satu per
  satu. Verifikasi terakhir (3 Agustus 2026) menunjukkan 453 file backend
  identik dengan `main`, tapi itu hasil pengecekan manual, bukan sesuatu yang
  dijamin oleh sistemnya.

Tujuannya: `/var/www/backend` jadi checkout sungguhan, deploy = `git pull`,
rollback = `git checkout <commit>`.

## Kendala yang harus ditangani

1. **Struktur direktori tidak sejajar.** Di monorepo, kode Laravel ada di
   `backend/`. Di server, isinya ada di root `/var/www/backend`. Git tidak bisa
   memetakan subdirektori repo ke root working tree, jadi checkout langsung
   tidak mungkin — perlu symlink (atau mengubah semua path konsumen).

2. **Tiga konsumen menunjuk path itu**, jadi kalau path berubah semuanya ikut:
   - `/etc/nginx/sites-available/api.ternakproperti.com`
   - `/etc/systemd/system/laravel-queue.service`
   - satu baris di `crontab -l` milik user `ubuntu`

   Pendekatan symlink di bawah dipilih justru supaya ketiganya **tidak perlu
   diubah**.

3. **Berkas runtime tidak ada di git** dan wajib ikut pindah:
   `.env`, `storage/` (termasuk upload & log), `vendor/`, `bootstrap/cache/`.

4. **Symlink sebagai document root** kadang rewel dengan opcache dan
   `realpath_cache` PHP-FPM. Harus di-restart, dan perlu dicek `SCRIPT_FILENAME`
   di nginx tidak mengandalkan path fisik.

## Langkah

Jalankan saat trafik sepi. Perkiraan 30–45 menit termasuk verifikasi.

```bash
# 1. Siapkan checkout baru (produksi belum tersentuh sama sekali)
sudo mkdir -p /var/www/onedashboard
sudo chown ubuntu:ubuntu /var/www/onedashboard
git clone git@github-onedashboard:smssamsul/onedashboard.git /var/www/onedashboard

# 2. Pindahkan berkas runtime yang tidak ada di git
cp /var/www/backend/.env            /var/www/onedashboard/backend/.env
cp -a /var/www/backend/storage/.    /var/www/onedashboard/backend/storage/
cp -a /var/www/backend/bootstrap/cache/. /var/www/onedashboard/backend/bootstrap/cache/

# 3. Dependency
cd /var/www/onedashboard/backend
composer install --no-dev --optimize-autoloader

# 4. Samakan kepemilikan dengan yang lama (cek dulu: stat -c '%U:%G' /var/www/backend)
sudo chown -R ubuntu:www-data /var/www/onedashboard
sudo find /var/www/onedashboard/backend/storage -type d -exec chmod 775 {} \;

# 5. Bandingkan dulu, jangan langsung tukar — harus 0 beda
#    (bandingkan file yang dilacak git saja, abaikan vendor/storage/.env)

# 6. Tukar (titik tidak-bisa-kembali; sesudah ini produksi menunjuk checkout baru)
sudo systemctl stop laravel-queue
sudo mv /var/www/backend /var/www/backend.legacy-YYYYMMDD
sudo ln -s /var/www/onedashboard/backend /var/www/backend
sudo systemctl restart php8.x-fpm
sudo systemctl start laravel-queue

# 7. Verifikasi
cd /var/www/backend && php artisan config:cache && php artisan route:cache
curl -sk -o /dev/null -w '%{http_code}\n' https://127.0.0.1/api/task     # 302
sudo systemctl status laravel-queue --no-pager | head -5
```

## Rollback

Selama `/var/www/backend.legacy-YYYYMMDD` masih ada, pemulihan hitungan detik:

```bash
sudo systemctl stop laravel-queue
sudo rm /var/www/backend                      # ini symlink, bukan direktori
sudo mv /var/www/backend.legacy-YYYYMMDD /var/www/backend
sudo systemctl restart php8.x-fpm
sudo systemctl start laravel-queue
```

Jangan hapus direktori legacy sampai sistem terbukti stabil beberapa hari.

## Setelah selesai

- Perbarui bagian **Deploy** di `CLAUDE.md` — langkah salin file diganti
  `git pull`.
- `/home/ubuntu/onedashboard-src` jadi tidak terpakai, boleh dihapus.
- Pertimbangkan menandai tiap rilis dengan tag supaya rollback menunjuk titik
  yang jelas, bukan menghitung commit.
