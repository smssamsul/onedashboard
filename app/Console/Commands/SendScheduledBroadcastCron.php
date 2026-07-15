<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\Broadcast;
use App\Models\Customer;
use App\Jobs\SendBroadcastJob;
use App\Jobs\SendBroadcastExcelJob;
use Carbon\Carbon;

class SendScheduledBroadcastCron extends Command
{
    /**
     * Command artisan
     */
    protected $signature = 'broadcast:send-scheduled {--debug : Mode debug tanpa kirim pesan WA}';

    protected $description = 'Proses broadcast yang sudah terjadwal dan sudah tiba waktunya.';

    public function handle()
    {
        $startTime = now();
        $this->info("=== Mulai proses broadcast terjadwal ===");
        Log::channel('broadcast')->info("=== Mulai proses broadcast terjadwal ===", [
            'timestamp' => $startTime->toDateTimeString(),
        ]);

        $debug = $this->option('debug');

        if ($debug) {
            $this->warn('⚠ Mode DEBUG aktif — pesan tidak akan dikirim ke queue');
        }

        // Ambil semua broadcast yang:
        // - status aktif (bukan 'N')
        // - langsung_kirim = false (dijadwalkan)
        // - tanggal_kirim <= sekarang
        // - belum pernah dikirim (status = '1' = pending, bukan '2' = selesai)
        $now = Carbon::now();

        $broadcasts = Broadcast::where('status', '1') // status aktif/pending
            ->whereNotNull('tanggal_kirim')
            ->where('tanggal_kirim', '<=', $now->toDateTimeString())
            ->get();

        $this->info("Ditemukan {$broadcasts->count()} broadcast yang siap diproses");

        if ($broadcasts->isEmpty()) {
            $this->info("Tidak ada broadcast yang perlu diproses saat ini.");
            return Command::SUCCESS;
        }

        $totalSent = 0;
        $totalFailed = 0;

        foreach ($broadcasts as $broadcast) {
            $this->info("Memproses broadcast ID: {$broadcast->id} - {$broadcast->nama}");
            Log::channel('broadcast')->info("Memproses broadcast terjadwal", [
                'broadcast_id' => $broadcast->id,
                'broadcast_nama' => $broadcast->nama,
                'tanggal_kirim' => $broadcast->tanggal_kirim,
            ]);

            // Parse target
            $target = is_array($broadcast->target)
                ? $broadcast->target
                : json_decode($broadcast->target, true);

            if (empty($target)) {
                $this->warn("⚠ Target tidak valid untuk broadcast ID: {$broadcast->id}, skip.");
                continue;
            }

            $tipe = $target['tipe'] ?? 'filter';
            $sentCount = 0;
            $failedCount = 0;

            if ($tipe === 'excel') {
                // Proses Excel-based broadcast
                $excelData = $target['excel_data'] ?? [];

                if (empty($excelData)) {
                    $this->warn("⚠ Excel data kosong untuk broadcast ID: {$broadcast->id}, skip.");
                    continue;
                }

                $this->info("Tipe: Excel, total kontak: " . count($excelData));

                if ($debug) {
                    $this->line("[DEBUG] Akan kirim ke " . count($excelData) . " kontak Excel");
                    continue;
                }

                foreach ($excelData as $kontak) {
                    try {
                        $phone = $kontak['phone'] ?? $kontak['wa'] ?? $kontak['no_wa'] ?? null;
                        $nama  = $kontak['name'] ?? $kontak['nama'] ?? 'Customer';

                        if (!$phone) {
                            $this->warn("⚠ No telp kosong, skip kontak.");
                            continue;
                        }

                        $woowaKey = env('WOOWA_KEY');
                        $senderSalesId = $target['sender_sales_id'] ?? null;
                        if ($senderSalesId) {
                            $selectedSales = \App\Models\Sales::where('user_id', $senderSalesId)->first();
                            if ($selectedSales && $selectedSales->woowa_key) {
                                $woowaKey = $selectedSales->woowa_key;
                            }
                        } else {
                            $creatorSales = \App\Models\Sales::where('user_id', $broadcast->create_by)->first();
                            if ($creatorSales && $creatorSales->woowa_key) {
                                $woowaKey = $creatorSales->woowa_key;
                            }
                        }

                        SendBroadcastExcelJob::dispatch(
                            $broadcast->id,
                            $broadcast->pesan,
                            $woowaKey,
                            $phone,
                            $nama,
                            $broadcast->create_by
                        );

                        $sentCount++;
                    } catch (\Exception $e) {
                        Log::channel('broadcast')->error('Gagal dispatch SendBroadcastExcelJob (scheduled)', [
                            'broadcast_id' => $broadcast->id,
                            'error' => $e->getMessage(),
                        ]);
                        $failedCount++;
                    }
                }
            } else {
                // Proses Filter-based broadcast
                $this->info("Tipe: Filter, mengambil orders...");

                try {
                    $orders = $this->getOrdersByTarget($target);
                    $this->info("Total orders ditemukan: " . $orders->count());

                    if ($orders->isEmpty()) {
                        $this->warn("⚠ Tidak ada order yang cocok untuk broadcast ID: {$broadcast->id}");
                    } else {
                        $uniqueOrdersByCustomer = $orders->unique('customer')->values();

                        if ($debug) {
                            $this->line("[DEBUG] Akan kirim ke " . $uniqueOrdersByCustomer->count() . " customer unik");
                            continue;
                        }

                        foreach ($uniqueOrdersByCustomer as $order) {
                            try {
                                $customer = $order->customer_rel ?? Customer::find($order->customer);
                                
                                $senderSalesId = $target['sender_sales_id'] ?? null;
                                if ($senderSalesId) {
                                    $woowaKey = env('WOOWA_KEY');
                                    $selectedSales = \App\Models\Sales::where('user_id', $senderSalesId)->first();
                                    if ($selectedSales && $selectedSales->woowa_key) {
                                        $woowaKey = $selectedSales->woowa_key;
                                    }
                                } else {
                                    $woowaKey = $this->getWoowaKeyFromSales($customer);
                                }

                                SendBroadcastJob::dispatch(
                                    $broadcast->id,
                                    $broadcast->pesan,
                                    $woowaKey,
                                    $order->id,
                                    $order->customer,
                                    $broadcast->create_by
                                );

                                $sentCount++;
                            } catch (\Exception $e) {
                                Log::channel('broadcast')->error('Gagal dispatch SendBroadcastJob (scheduled)', [
                                    'broadcast_id' => $broadcast->id,
                                    'order_id' => $order->id,
                                    'error' => $e->getMessage(),
                                ]);
                                $failedCount++;
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::channel('broadcast')->error('Error saat getOrdersByTarget (scheduled broadcast)', [
                        'broadcast_id' => $broadcast->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Tandai broadcast sebagai sudah diproses (status = '2')
            if (!$debug) {
                $broadcast->update([
                    'status' => '3',
                    'update_at' => now(),
                ]);
            }

            $totalSent += $sentCount;
            $totalFailed += $failedCount;

            $this->info("Broadcast ID {$broadcast->id} selesai — Terkirim ke queue: {$sentCount}, Gagal: {$failedCount}");
            Log::channel('broadcast')->info("Broadcast terjadwal selesai diproses", [
                'broadcast_id' => $broadcast->id,
                'sent_to_queue' => $sentCount,
                'failed' => $failedCount,
            ]);
        }

        $endTime = now();
        $duration = $endTime->diffInSeconds($startTime);

        $this->info("=== Proses broadcast terjadwal selesai ===");
        $this->info("Total broadcast diproses: {$broadcasts->count()}");
        $this->info("Total dikirim ke queue: {$totalSent}, Gagal: {$totalFailed}");
        $this->info("Durasi: {$duration} detik");

        Log::channel('broadcast')->info("=== Proses broadcast terjadwal selesai ===", [
            'total_broadcast' => $broadcasts->count(),
            'total_sent' => $totalSent,
            'total_failed' => $totalFailed,
            'duration_seconds' => $duration,
        ]);

        return Command::SUCCESS;
    }

    /**
     * Ambil orders berdasarkan target conditions
     */
    private function getOrdersByTarget(array $target)
    {
        $query = \App\Models\OrderCustomer::with(['customer_rel'])
            ->where('status', '!=', 'N')
            ->distinct();

        // Filter berdasarkan produk
        if (!empty($target['produk']) && is_array($target['produk'])) {
            $query->whereIn('produk', $target['produk']);
        } elseif (!empty($target['produk'])) {
            $query->where('produk', $target['produk']);
        }

        // Filter berdasarkan status_pembayaran
        if (isset($target['status_pembayaran'])) {
            $query->where('status_pembayaran', $target['status_pembayaran']);
        }

        // Filter berdasarkan status_order
        if (isset($target['status_order']) && $target['status_order'] !== '') {
            $query->where('status_order', $target['status_order']);
        }

        return $query->get();
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = \App\Models\Sales::where('user_id', $customer->sales_id)->first();

        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        return env('WOOWA_KEY');
    }
}
