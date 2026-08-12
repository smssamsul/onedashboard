<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\OrderCustomer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class MergeDuplicateCustomerWa extends Command
{
    /**
     * Gabungkan customer yang punya nomor wa sama (harusnya satu orang,
     * kepecah gara-gara race condition submit order/quick-order hampir
     * bersamaan). Dipakai sekali untuk bersih-bersih data lama sebelum
     * constraint unique(wa) dipasang, dan bisa dipakai ulang kalau
     * duplikat baru muncul.
     *
     * Yang "menang" (dipertahankan) per grup wa: order terbanyak, lalu
     * yang punya email asli (bukan pola order_xxx@quickorder.local),
     * lalu yang paling lama dibuat. Yang kalah: order-nya dipindah ke
     * pemenang, lalu di-nonaktifkan (status='N') - bukan dihapus,
     * supaya masih bisa ditelusuri/dibatalkan.
     */
    protected $signature = 'customer:merge-duplicate-wa {--dry-run : Tampilkan rencana tanpa mengubah data}';

    protected $description = 'Gabungkan customer duplikat yang punya nomor WA sama ke satu record, pindahkan order-nya, nonaktifkan sisanya.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $duplicateWas = DB::table('customer')
            ->select('wa')
            ->whereNotNull('wa')
            ->where('wa', '!=', '')
            ->groupBy('wa')
            ->havingRaw('count(*) > 1')
            ->pluck('wa');

        $this->info("Ditemukan {$duplicateWas->count()} nomor WA dengan lebih dari satu customer aktif.");

        if ($duplicateWas->isEmpty()) {
            return self::SUCCESS;
        }

        $backupDir = storage_path('app/backup-merge-duplicate-wa-' . now()->format('Ymd-His'));
        if (!$dryRun) {
            File::ensureDirectoryExists($backupDir);
        }

        foreach ($duplicateWas as $wa) {
            $customers = Customer::where('wa', $wa)->where('status', '!=', 'N')->get();

            // Sudah pernah dibereskan run sebelumnya (tinggal 1 yang aktif) - lewati.
            if ($customers->count() < 2) {
                continue;
            }

            $winner = $customers->sortByDesc(function (Customer $c) {
                $orderCount = OrderCustomer::where('customer', $c->id)->count();
                $hasRealEmail = ($c->email && !str_ends_with($c->email, '@quickorder.local')) ? 1 : 0;
                $createTs = ($c->create_at && strtotime($c->create_at))
                    ? -strtotime($c->create_at)
                    : -PHP_INT_MAX;

                return [$orderCount, $hasRealEmail, $createTs];
            })->first();

            $losers = $customers->reject(fn (Customer $c) => $c->id === $winner->id);

            $this->line("wa={$wa}: pertahankan id={$winner->id} ({$winner->nama}), gabung & nonaktifkan id=" . $losers->pluck('id')->implode(','));

            if ($dryRun) {
                continue;
            }

            $backupPayload = [
                'wa' => $wa,
                'winner_id' => $winner->id,
                'customers' => $customers->toArray(),
                'orders' => OrderCustomer::whereIn('customer', $customers->pluck('id'))->get()->toArray(),
            ];
            file_put_contents(
                "{$backupDir}/wa-{$wa}.json",
                json_encode($backupPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            );

            DB::transaction(function () use ($losers, $winner) {
                foreach ($losers as $loser) {
                    OrderCustomer::where('customer', $loser->id)->update([
                        'customer' => $winner->id,
                        'update_at' => now(),
                    ]);

                    Customer::where('id', $loser->id)->update([
                        'status' => 'N',
                        'update_at' => now(),
                    ]);
                }
            });
        }

        $this->info($dryRun
            ? 'Dry run selesai — tidak ada data yang diubah.'
            : "Selesai. Backup per-grup tersimpan di: {$backupDir}");

        return self::SUCCESS;
    }
}
