<?php

namespace App\Console\Commands;

use App\Models\OrderCustomer;
use App\Services\AttendanceQrService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillQrKehadiran extends Command
{
    protected $signature = 'attendance:backfill-qr-token
        {--days=30 : Rentang hari ke belakang dari sekarang, berdasarkan waktu_pembayaran}
        {--dry-run : Tampilkan daftar order yang akan diproses tanpa menyimpan apa pun}
        {--send-wa : Kirim juga WA notifikasi tiket ke customer (default: token dibuat diam-diam saja, seperti saat customer buka halaman tiket kehadiran)}';

    protected $description = 'Backfill qr_token untuk order Lunas dalam N hari terakhir (produk yang punya jadwal event/seminar) yang belum punya qr_token.';

    public function handle(AttendanceQrService $qrService): int
    {
        $days = (int) $this->option('days');
        $dryRun = (bool) $this->option('dry-run');
        $sendWa = (bool) $this->option('send-wa');
        $since = Carbon::now()->subDays($days);

        $this->info("=== Backfill QR Kehadiran (Lunas, {$days} hari terakhir sejak {$since->toDateString()}) ===");
        if ($dryRun) {
            $this->warn('Mode dry-run: tidak ada data yang disimpan / WA dikirim.');
        }
        if ($sendWa) {
            $this->warn('Mode --send-wa aktif: WA notifikasi tiket akan dikirim ke customer yang belum punya token.');
        } else {
            $this->line('Token dibuat diam-diam (tanpa WA) - pakai --send-wa kalau mau sekalian notifikasi customer.');
        }

        $orders = OrderCustomer::with(['customer_rel', 'produk_rel'])
            ->where('status', '!=', 'N')
            ->where('status_pembayaran', '2')
            ->whereNull('qr_token')
            ->where('waktu_pembayaran', '>=', $since)
            ->orderBy('waktu_pembayaran', 'asc')
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Tidak ada order Lunas tanpa qr_token dalam rentang ini.');
            return 0;
        }

        $processed = 0;
        $skippedNotEligible = 0;

        foreach ($orders as $order) {
            if (!$qrService->isEligible($order)) {
                $skippedNotEligible++;
                continue;
            }

            $customerNama = $order->customer_rel->nama ?? '-';
            $produkNama = $order->produk_rel->nama ?? '-';
            $bayarAt = $order->waktu_pembayaran ? Carbon::parse($order->waktu_pembayaran)->format('Y-m-d H:i') : '-';

            $this->line(" - #{$order->id} | {$customerNama} | {$produkNama} | bayar: {$bayarAt}");

            if ($dryRun) {
                $processed++;
                continue;
            }

            if ($sendWa) {
                $qrService->handlePaymentApproved($order);
            } else {
                $qrService->ensureToken($order);
            }

            $processed++;
        }

        $this->info("Selesai. Order diproses: {$processed}. Dilewati (produk tanpa jadwal event): {$skippedNotEligible}.");

        return 0;
    }
}
