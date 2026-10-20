<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Migrasi satu-kali: kalibrasi order_customer.sumber & utm_source supaya
 * konsisten dengan konvensi di database "boosterin" (dicek manual, 2026-10-20).
 *
 * Root cause yang ditemukan: form Order Cepat (QuickOrderSalesPage.js) selama
 * ini menyimpan pilihan dropdown "Sumber / Keterangan" ke kolom utm_source,
 * BUKAN ke sumber - sumber selalu hardcode "sales_quick_order" apa pun yang
 * dipilih. Makanya utm_source kita berantakan (isinya macam-macam: lpwa,
 * radio, metaads, TDW, Jakarta, CRM, ZOOM, dst - padahal semestinya cuma
 * penanda iklan ads/sosmedtp/sosmedda, persis seperti boosterin).
 *
 * Dua langkah:
 * 1. Baris sumber='sales_quick_order': derive sumber BARU dari utm_source LAMA
 *    (nilai dropdown yang sebenarnya), sebelum utm_source ditimpa.
 * 2. Semua baris: normalisasi sumber (Title Case / konsolidasi varian, ikut
 *    pola boosterin) DAN persempit utm_source jadi cuma ads/sosmedtp/sosmedda
 *    (selain itu -> NULL, pindah makna ke kolom sumber).
 */
class KalibrasiSumberOrder extends Command
{
    protected $signature = 'order:kalibrasi-sumber {--dry-run}';

    protected $description = 'Kalibrasi order_customer.sumber & utm_source supaya konsisten dengan konvensi boosterin';

    /** utm_source lama (dari dropdown Order Cepat) -> sumber baru, untuk baris sumber=sales_quick_order. */
    private const PILIHAN_QUICK_ORDER = [
        'lpwa' => 'Lpwa',
        'radio' => 'Radio',
        'metaads' => 'Meta Ads',
        // sosmedtp/sosmedda SENGAJA tidak dipetakan ke sumber - di boosterin dua
        // nilai itu cuma pernah muncul di utm_source, tidak pernah di source.
    ];

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        // ================= LANGKAH 1: sales_quick_order -> derive dari utm_source lama =================
        $this->info('=== Langkah 1: baris sumber=sales_quick_order (derive dari utm_source lama) ===');

        $rows = DB::table('order_customer')
            ->where('sumber', 'sales_quick_order')
            ->select('id', 'utm_source')
            ->get();
        $this->info("Ditemukan {$rows->count()} baris sumber=sales_quick_order.");

        $rencana1 = []; // id => sumber baru
        $tally1 = [];
        foreach ($rows as $r) {
            $pilihan = strtolower(trim((string) $r->utm_source));
            // "-" adalah placeholder kosong dari versi form lama (bukan input
            // asli), sama seperti string kosong - jangan ikut dipropagasi.
            if ($pilihan === '' || $pilihan === '-' || in_array($pilihan, ['sosmedtp', 'sosmedda'], true)) {
                continue; // biarkan sumber tetap 'sales_quick_order'
            }
            $baru = self::PILIHAN_QUICK_ORDER[$pilihan] ?? $this->normalisasiSumber(trim((string) $r->utm_source)); // "lainnya" (free text) -> ikut dinormalisasi juga
            $rencana1[$r->id] = $baru;
            $tally1[$baru] = ($tally1[$baru] ?? 0) + 1;
        }
        arsort($tally1);
        foreach ($tally1 as $nilai => $jumlah) {
            $this->line("  -> \"{$nilai}\": {$jumlah} baris");
        }

        // ================= LANGKAH 2: normalisasi sumber utk SEMUA baris lain (bukan sales_quick_order) =================
        $this->info('=== Langkah 2: normalisasi sumber (Title Case / konsolidasi) utk baris lain ===');

        $rowsLain = DB::table('order_customer')
            ->where(function ($q) {
                $q->where('sumber', '!=', 'sales_quick_order')->orWhereNull('sumber');
            })
            ->whereNotNull('sumber')
            ->select('id', 'sumber')
            ->get();

        $rencana2 = [];
        $tally2 = [];
        foreach ($rowsLain as $r) {
            $baru = $this->normalisasiSumber($r->sumber);
            if ($baru !== $r->sumber) {
                $rencana2[$r->id] = $baru;
            }
            $tally2["{$r->sumber} -> {$baru}"] = ($tally2["{$r->sumber} -> {$baru}"] ?? 0) + 1;
        }
        arsort($tally2);
        foreach ($tally2 as $label => $jumlah) {
            if (!str_contains($label, ' -> ') || explode(' -> ', $label)[0] === explode(' -> ', $label)[1]) {
                continue; // skip yang tidak berubah, biar ringkas
            }
            $this->line("  {$label} : {$jumlah} baris");
        }

        // ================= LANGKAH 3: persempit utm_source =================
        $this->info('=== Langkah 3: persempit utm_source jadi cuma ads/sosmedtp/sosmedda ===');
        $jumlahUtmDipersempit = DB::table('order_customer')
            ->whereNotNull('utm_source')
            ->whereNotIn('utm_source', ['ads', 'sosmedtp', 'sosmedda'])
            ->count();
        $this->info("Baris utm_source akan dikosongkan (NULL): {$jumlahUtmDipersempit}");

        if ($dryRun) {
            $this->info('[DRY-RUN] Tidak ada yang ditulis ke database.');
            return self::SUCCESS;
        }

        // ================= BACKUP sebelum eksekusi =================
        $semuaIdBerubah = array_unique(array_merge(array_keys($rencana1), array_keys($rencana2)));
        $backupRows = DB::table('order_customer')
            ->whereIn('id', $semuaIdBerubah)
            ->orWhere(function ($q) {
                $q->whereNotNull('utm_source')->whereNotIn('utm_source', ['ads', 'sosmedtp', 'sosmedda']);
            })
            ->select('id', 'kode_order', 'sumber', 'utm_source')
            ->get();
        $backupPath = storage_path('app/backup-kalibrasi-sumber-order-' . now()->format('Ymd-His') . '.json');
        file_put_contents($backupPath, $backupRows->toJson(JSON_PRETTY_PRINT));
        $this->info("Backup {$backupRows->count()} baris disimpan ke: {$backupPath}");

        DB::transaction(function () use ($rencana1, $rencana2) {
            foreach ($rencana1 as $id => $sumberBaru) {
                DB::table('order_customer')->where('id', $id)->update(['sumber' => $sumberBaru, 'update_at' => now()]);
            }
            foreach ($rencana2 as $id => $sumberBaru) {
                DB::table('order_customer')->where('id', $id)->update(['sumber' => $sumberBaru, 'update_at' => now()]);
            }
            DB::table('order_customer')
                ->whereNotNull('utm_source')
                ->whereNotIn('utm_source', ['ads', 'sosmedtp', 'sosmedda'])
                ->update(['utm_source' => null]);
        });

        $this->info('Selesai. sumber diperbarui: ' . (count($rencana1) + count($rencana2)) . ' baris. utm_source dipersempit: ' . $jumlahUtmDipersempit . ' baris.');

        return self::SUCCESS;
    }

    private function normalisasiSumber(string $sumber): string
    {
        $s = trim($sumber);
        $lower = strtolower($s);

        if (preg_match('/^meta\s*ads\b(.*)$/i', $s, $m)) {
            return 'Meta Ads' . $m[1];
        }

        return match (true) {
            $lower === 'lpwa' => 'Lpwa',
            $lower === 'radio' => 'Radio',
            $lower === 'website' => 'Website',
            in_array($lower, ['jakarta', 'seminar jakarta'], true) => 'Seminar Jakarta',
            in_array($lower, ['bandung', 'seminar bandung'], true) => 'Seminar Bandung',
            in_array($lower, ['zoom', 'zoom as', 'zoom pipo'], true) => 'Zoom',
            $lower === 'pipo' => 'Pipo',
            $lower === 'scalev' => 'Scalev',
            $lower === 'crm' => 'CRM',
            default => $s,
        };
    }
}
