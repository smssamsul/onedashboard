<?php

namespace App\Console\Commands;

use App\Models\OrderCustomer;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class BackfillKodeOrder extends Command
{
    protected $signature = 'orders:backfill-kode-order {--dry-run : Tampilkan perubahan tanpa menyimpan} {--date= : Batasi ke tanggal tertentu (YYYY-MM-DD)}';

    protected $description = 'Isi kode_order untuk order lama (format ORDddmmyyNNNN, reset per hari).';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $dateFilter = $this->option('date');

        $this->info('=== Backfill kode_order ===');
        if ($dryRun) $this->warn('Mode dry-run: tidak ada data yang disimpan.');
        if ($dateFilter) $this->line('Filter date: ' . $dateFilter);

        $baseQuery = OrderCustomer::query()
            ->select(['id', 'create_at', 'tanggal', 'kode_order'])
            ->where(function ($q) {
                $q->whereNull('kode_order')->orWhere('kode_order', '=', '');
            });

        if (!empty($dateFilter)) {
            try {
                $d = Carbon::parse($dateFilter)->toDateString();
                $baseQuery->where(function ($q) use ($d) {
                    $q->whereDate('create_at', $d)->orWhereDate('tanggal', $d);
                });
            } catch (\Throwable $e) {
                $this->error('Format --date tidak valid. Gunakan YYYY-MM-DD.');
                return 1;
            }
        }

        $orders = $baseQuery
            ->orderByRaw("COALESCE(create_at, tanggal) asc")
            ->orderBy('id', 'asc')
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Tidak ada order yang perlu di-backfill.');
            return 0;
        }

        $groups = $orders->groupBy(function ($o) {
            $dt = $o->create_at ?: $o->tanggal;
            if (!$dt) return 'unknown';
            return Carbon::parse($dt)->toDateString();
        });

        foreach ($groups as $dateKey => $items) {
            if ($dateKey === 'unknown') {
                $this->warn("Skip: ada " . $items->count() . " order tanpa tanggal/create_at.");
                continue;
            }

            DB::transaction(function () use ($dateKey, $items, $dryRun) {
                $date = Carbon::parse($dateKey);
                $prefix = 'ORD' . $date->format('dmy');

                // Start dari max yang sudah ada untuk hari ini
                $lastKode = OrderCustomer::query()
                    ->whereNotNull('kode_order')
                    ->where('kode_order', 'like', $prefix . '%')
                    ->whereDate('create_at', $dateKey)
                    ->lockForUpdate()
                    ->orderBy('kode_order', 'desc')
                    ->value('kode_order');

                $seq = 0;
                if (is_string($lastKode) && strlen($lastKode) >= (strlen($prefix) + 4)) {
                    $tail = substr($lastKode, -4);
                    if (ctype_digit($tail)) $seq = (int) $tail;
                }

                $this->line("Tanggal {$dateKey} | start seq: " . str_pad((string) $seq, 4, '0', STR_PAD_LEFT) . " | count: " . $items->count());

                foreach ($items as $order) {
                    $seq++;
                    $kode = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

                    $this->line(" - #{$order->id} => {$kode}");

                    if ($dryRun) continue;

                    OrderCustomer::where('id', $order->id)->update([
                        'kode_order' => $kode,
                    ]);
                }
            });
        }

        $this->info('Selesai.');
        return 0;
    }
}

