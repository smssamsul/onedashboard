<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Migrasi satu-kali: baris order_customer.sumber='sales_quick_order' yang
 * tersisa (sales tidak pilih apa pun di dropdown Order Cepat) di-backfill
 * dari lead_lpwas yang cocok (match lewat nomor WA customer) - supaya
 * konsisten dengan boosterin, yang TIDAK PERNAH punya literal
 * "sales_quick_order": attribusi order di sana selalu ditelusuri ke sumber
 * lead aslinya (webhook Meta Ads / LPWA), bukan dibiarkan generic.
 *
 * Dikonfirmasi manual ke pemilik repo (2026-10-20) - dicek silang ke
 * boosterin.orders: order yang di kita "sales_quick_order" ternyata di sana
 * sudah terisi "Meta Ads vX" / "Meta Ads" / "Lpwa" dll, hasil attribusi
 * sebenarnya. Order yang TIDAK ketemu lead_lpwas cocoknya dikosongkan
 * (NULL) - boosterin juga begitu utk order yang memang tidak ada sumbernya.
 */
class BackfillSumberQuickOrderDariLead extends Command
{
    protected $signature = 'order:backfill-sumber-quick-order-dari-lead {--dry-run}';

    protected $description = 'Backfill order_customer.sumber=sales_quick_order dari lead_lpwas yang cocok (match no WA), sisanya dikosongkan';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $rows = DB::table('order_customer as oc')
            ->join('customer as c', 'c.id', '=', 'oc.customer')
            ->leftJoin('lead_lpwas as l', 'l.no_wa', '=', 'c.wa')
            ->where('oc.sumber', 'sales_quick_order')
            ->select('oc.id', 'l.sumber as lead_sumber')
            ->get();

        $this->info("Ditemukan {$rows->count()} baris sumber=sales_quick_order.");

        $diisiDariLead = [];
        $dikosongkan = [];
        $tally = [];
        foreach ($rows as $r) {
            if (!empty($r->lead_sumber)) {
                $diisiDariLead[$r->id] = $r->lead_sumber;
                $tally[$r->lead_sumber] = ($tally[$r->lead_sumber] ?? 0) + 1;
            } else {
                $dikosongkan[] = $r->id;
            }
        }

        arsort($tally);
        foreach ($tally as $nilai => $jumlah) {
            $this->line("  -> \"{$nilai}\": {$jumlah} baris");
        }
        $this->info('Diisi dari lead_lpwas yang cocok: ' . count($diisiDariLead) . ' baris.');
        $this->info('Tidak ada lead cocok, dikosongkan (NULL): ' . count($dikosongkan) . ' baris.');

        if ($dryRun) {
            $this->info('[DRY-RUN] Tidak ada yang ditulis ke database.');
            return self::SUCCESS;
        }

        $semuaId = array_merge(array_keys($diisiDariLead), $dikosongkan);
        $backupRows = DB::table('order_customer')->whereIn('id', $semuaId)->select('id', 'kode_order', 'sumber')->get();
        $backupPath = storage_path('app/backup-backfill-sumber-quickorder-' . now()->format('Ymd-His') . '.json');
        file_put_contents($backupPath, $backupRows->toJson(JSON_PRETTY_PRINT));
        $this->info("Backup {$backupRows->count()} baris disimpan ke: {$backupPath}");

        DB::transaction(function () use ($diisiDariLead, $dikosongkan) {
            foreach ($diisiDariLead as $id => $sumberBaru) {
                DB::table('order_customer')->where('id', $id)->update(['sumber' => $sumberBaru, 'update_at' => now()]);
            }
            if (!empty($dikosongkan)) {
                DB::table('order_customer')->whereIn('id', $dikosongkan)->update(['sumber' => null, 'update_at' => now()]);
            }
        });

        $this->info('Selesai.');

        return self::SUCCESS;
    }
}
