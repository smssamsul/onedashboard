<?php

namespace App\Console\Commands;

use App\Models\Produk;
use App\Models\ProdukJadwal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SyncJadwalSeminarKota extends Command
{
    /**
     * Koreksi jadwal (tanggal/jam/lokasi) 7 produk seminar kota yang
     * datanya tidak sinkron antara tabel produk_jadwal dan teks yang
     * ter-hardcode di block "list" landing page masing-masing produk.
     * Sekali pakai untuk perbaikan data per 2026-08-14 - referensi
     * "data valid" adalah pesan user di chat.
     */
    protected $signature = 'produk:sync-jadwal-seminar-kota {--dry-run : Tampilkan rencana tanpa mengubah data}';

    protected $description = 'Sinkronkan jadwal seminar Sidoarjo/Surabaya/Gorontalo/Manado/Makassar/Kendari/Palu ke data valid dari user, termasuk teks di landing page masing-masing.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $backupDir = storage_path('app/backup-sync-jadwal-seminar-kota-' . now()->format('Ymd-His'));

        $plans = [
            'seminar-sidoarjo' => [
                'produk' => [
                    'tempat' => 'Hotel Luminor Sidoarjo',
                    'alamat' => 'Jl. Pahlawan, Jetis, Lemahputro, Sidoarjo',
                ],
                'jadwal_deactivate' => [129], // Sesi 1 08:30 dihapus, tersisa 1 sesi saja
                'landing_list' => [
                    'Clock' => '<p><span style="font-family: Inter, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; color: rgb(51, 51, 51);">13.00 WIB</span></p>',
                    'MapPin' => '<p>Hotel Luminor Sidoarjo</p>',
                ],
            ],
            'seminar-surabaya' => [
                'produk' => [
                    'tempat' => 'Kampi Hotel Tunjungan Surabaya',
                    'alamat' => 'Jl. Taman Apsari No. 3-5, Embong Kaliasin, Surabaya',
                ],
                'jadwal_deactivate' => [],
                'landing_list' => [
                    'MapPin' => '<p>Kampi Hotel Tunjungan Surabaya</p>',
                ],
            ],
            'seminar-gorontalo' => [
                'produk' => [],
                'jadwal_deactivate' => [],
                'landing_list' => [
                    'Calendar' => '<p><span style="font-family: Inter, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; color: rgb(51, 51, 51);">Selasa 15 September 2026</span></p>',
                ],
            ],
            'seminar-manado' => [
                'produk' => [],
                'jadwal_deactivate' => [],
                'landing_list' => [
                    'Calendar' => '<p><span style="font-family: Inter, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; color: rgb(51, 51, 51);">Jumat 18 September 2026</span></p>',
                ],
            ],
            'seminar-makassar' => [
                'produk' => [],
                'jadwal_rename' => [214 => 'Sesi 2'],
                'jadwal_deactivate' => [],
                'landing_list' => [
                    'Calendar' => '<p><span style="font-family: Inter, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; color: rgb(51, 51, 51);">Senin 21 September 2026</span></p>',
                    'Clock' => '<p><span style="font-family: Inter, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, &quot;Helvetica Neue&quot;, Arial, sans-serif; font-size: 16px; color: rgb(51, 51, 51);">Sesi 2 : 13.00 WIB</span></p>',
                ],
            ],
            'seminar-as-kendari' => [
                'produk' => [
                    'tempat' => 'Hotel Santika',
                ],
                'jadwal_deactivate' => [],
                'landing_list' => [],
            ],
            'seminar-as-palu' => [
                'produk' => [],
                'jadwal_rename' => [196 => 'Sesi 2'],
                'jadwal_deactivate' => [],
                'jadwal_add' => [
                    ['nama_jadwal' => 'Sesi 1', 'waktu_mulai' => '2026-09-26 08:30:00', 'kuota' => 9999, 'status' => 'A'],
                ],
                'landing_list' => [],
            ],
        ];

        if (!$dryRun) {
            File::ensureDirectoryExists($backupDir);
        }

        foreach ($plans as $kode => $plan) {
            $produk = Produk::where('kode', $kode)->first();

            if (!$produk) {
                $this->error("Produk dengan kode={$kode} tidak ditemukan, dilewati.");
                continue;
            }

            $jadwalRows = ProdukJadwal::where('produk_id', $produk->id)->get();

            $this->info("--- {$kode} (produk_id={$produk->id}) ---");

            if (!$dryRun) {
                file_put_contents(
                    "{$backupDir}/{$kode}.json",
                    json_encode([
                        'produk' => $produk->toArray(),
                        'jadwal' => $jadwalRows->toArray(),
                    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
                );
            }

            // 1. Update field produk (tempat/alamat)
            if (!empty($plan['produk'])) {
                foreach ($plan['produk'] as $field => $value) {
                    $this->line("  produk.{$field}: \"{$produk->{$field}}\" -> \"{$value}\"");
                }
                if (!$dryRun) {
                    $produk->fill($plan['produk']);
                }
            }

            // 2. Nonaktifkan jadwal yang tidak dipakai lagi
            foreach (($plan['jadwal_deactivate'] ?? []) as $jadwalId) {
                $this->line("  nonaktifkan jadwal id={$jadwalId}");
                if (!$dryRun) {
                    ProdukJadwal::where('id', $jadwalId)->update(['status' => 'N', 'updated_at' => now()]);
                }
            }

            // 3. Rename label sesi
            foreach (($plan['jadwal_rename'] ?? []) as $jadwalId => $namaBaru) {
                $this->line("  rename jadwal id={$jadwalId} -> nama_jadwal=\"{$namaBaru}\"");
                if (!$dryRun) {
                    ProdukJadwal::where('id', $jadwalId)->update(['nama_jadwal' => $namaBaru, 'updated_at' => now()]);
                }
            }

            // 4. Tambah jadwal baru
            foreach (($plan['jadwal_add'] ?? []) as $newJadwal) {
                $this->line("  tambah jadwal baru: {$newJadwal['nama_jadwal']} @ {$newJadwal['waktu_mulai']}");
                if (!$dryRun) {
                    ProdukJadwal::create(array_merge($newJadwal, ['produk_id' => $produk->id]));
                }
            }

            // 5. Update teks block "list" di landingpage (by icon: Calendar/Clock/MapPin)
            if (!empty($plan['landing_list'])) {
                $landingpage = $produk->landingpage;
                if (is_array($landingpage)) {
                    $changed = false;
                    foreach ($landingpage as &$block) {
                        if (($block['type'] ?? null) !== 'list') {
                            continue;
                        }
                        foreach ($block['content']['items'] ?? [] as &$item) {
                            $icon = $item['icon'] ?? null;
                            if ($icon && array_key_exists($icon, $plan['landing_list'])) {
                                $this->line("  landing list [{$icon}]: \"" . strip_tags($item['content']) . '" -> "' . strip_tags($plan['landing_list'][$icon]) . '"');
                                if (!$dryRun) {
                                    $item['content'] = $plan['landing_list'][$icon];
                                    $changed = true;
                                }
                            }
                        }
                        unset($item);
                    }
                    unset($block);

                    if ($changed) {
                        $produk->landingpage = json_encode($landingpage, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                    }
                } else {
                    $this->warn('  (landing page tidak punya block "list" - tidak ada yang diubah di sini)');
                }
            }

            if (!$dryRun) {
                $produk->update_at = now()->toDateTimeString();
                $produk->save();
            }
        }

        $this->info($dryRun
            ? 'Dry run selesai - tidak ada data yang diubah.'
            : "Selesai. Backup per-produk tersimpan di: {$backupDir}");

        return self::SUCCESS;
    }
}
