<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Migrasi satu-kali: rapikan lead_lpwas.sumber untuk keluarga "Meta Ads ..."
 * yang berantakan (case beda-beda & ekor sampah dari input manual/webhook).
 * Dikonfirmasi manual ke pemilik repo (2026-10-20) dari 3 contoh tangkapan
 * layar - lihat 3 kasus di bawah.
 *
 * Aturan (cuma utk sumber yang berawalan "meta ads", case-insensitive):
 *  1. "Meta Ads" tanpa kode sama sekali -> tetap "Meta Ads".
 *  2. Kode yang SUDAH bersih (huruf lalu angka semua, mis. v9, v16, v30, i4,
 *     c1, x1) -> cuma disamakan case-nya: "Meta Ads" + kode huruf kecil.
 *     Ini yang bikin "meta ads v6" dan "Meta Ads V6" jadi satu "Meta Ads v6".
 *  3. Kode yang karakter KE-2-nya angka tapi ada ekor sampah sesudahnya
 *     (mis. "v9Crnya", "v2Ikut", "v1ternak") -> ambil 2 karakter pertama
 *     saja, huruf kecil: jadi "Meta Ads v9" / "Meta Ads v2" / "Meta Ads v1".
 *  4. Selain itu (kode cuma kata-kata aneh tanpa pola kode, mis. "Bisa",
 *     "Ini", "Online", "Sprt", "saya", "Terimakasih", "Sy") -> dikosongkan
 *     (NULL) total, bukan cuma "Meta Ads" polos - datanya memang tidak jelas.
 */
class KalibrasiSumberLeadLpwa extends Command
{
    protected $signature = 'lead-lpwa:kalibrasi-sumber {--dry-run}';

    protected $description = 'Rapikan lead_lpwas.sumber "Meta Ads ..." yang berantakan (case beda & ekor sampah)';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $rows = DB::table('lead_lpwas')
            ->whereNotNull('sumber')
            ->whereRaw("sumber ILIKE 'meta ads%'")
            ->select('id', 'sumber')
            ->get();

        $this->info("Ditemukan {$rows->count()} baris sumber berawalan \"Meta Ads\".");

        $rencana = []; // id => sumber baru (atau null)
        $tally = [];
        foreach ($rows as $r) {
            $baru = $this->normalisasi($r->sumber);
            if ($baru !== $r->sumber) {
                $rencana[$r->id] = $baru;
            }
            $label = $r->sumber . ' -> ' . ($baru ?? '(NULL)');
            $tally[$label] = ($tally[$label] ?? 0) + 1;
        }

        arsort($tally);
        foreach ($tally as $label => $jumlah) {
            [$lama, $baruLabel] = explode(' -> ', $label);
            if ($lama === $baruLabel) {
                continue; // tidak berubah, tidak usah ditampilkan
            }
            $this->line("  {$label} : {$jumlah} baris");
        }
        $this->info('Total baris yang akan berubah: ' . count($rencana));

        if ($dryRun) {
            $this->info('[DRY-RUN] Tidak ada yang ditulis ke database.');
            return self::SUCCESS;
        }

        $backupRows = DB::table('lead_lpwas')->whereIn('id', array_keys($rencana))->select('id', 'no_wa', 'sumber')->get();
        $backupPath = storage_path('app/backup-kalibrasi-sumber-lead-lpwa-' . now()->format('Ymd-His') . '.json');
        file_put_contents($backupPath, $backupRows->toJson(JSON_PRETTY_PRINT));
        $this->info("Backup {$backupRows->count()} baris disimpan ke: {$backupPath}");

        DB::transaction(function () use ($rencana) {
            foreach ($rencana as $id => $sumberBaru) {
                DB::table('lead_lpwas')->where('id', $id)->update(['sumber' => $sumberBaru]);
            }
        });

        $this->info('Selesai. ' . count($rencana) . ' baris diperbarui.');

        return self::SUCCESS;
    }

    private function normalisasi(string $sumber): ?string
    {
        if (!preg_match('/^meta\s*ads\s*(.*)$/i', trim($sumber), $m)) {
            return $sumber; // jaga-jaga, harusnya tidak kejadian (query sudah difilter)
        }

        $kode = trim($m[1]);
        if ($kode === '') {
            return 'Meta Ads';
        }

        // Kasus 2: kode bersih - satu huruf diikuti angka SELURUHNYA (v9, v16, v30, i4, c1, x1, dst).
        if (preg_match('/^[a-z][0-9]+$/i', $kode)) {
            return 'Meta Ads ' . strtolower($kode);
        }

        // Kasus 3: karakter ke-2 angka tapi ada ekor sampah sesudahnya -> ambil 2 karakter pertama.
        if (strlen($kode) >= 2 && ctype_digit($kode[1])) {
            return 'Meta Ads ' . strtolower(substr($kode, 0, 2));
        }

        // Kasus 4: kata-kata aneh tanpa pola kode -> kosongkan total.
        return null;
    }
}
