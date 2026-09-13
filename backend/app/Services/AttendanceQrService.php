<?php

namespace App\Services;

use App\Models\OrderCustomer;
use App\Models\ProdukJadwal;
use App\Models\Sales;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * QR tiket kehadiran per-order: dibuat otomatis begitu order Paid, dikirim
 * lewat WA berisi link ke member area (customer download QR-nya di sana).
 * Cuma untuk produk yang punya jadwal fisik (ProdukJadwal) - produk seperti
 * buku/ecourse tidak butuh kehadiran.
 *
 * Dipanggil dari dua titik order bisa jadi Paid: OrderValidationController
 * (approve manual finance) dan DokuController (callback payment gateway).
 */
class AttendanceQrService
{
    /**
     * Cek apakah produk order ini butuh QR kehadiran (punya jadwal fisik).
     * Buku/ecourse dsb tidak punya ProdukJadwal jadi otomatis dilewati.
     */
    public function isEligible(OrderCustomer $order): bool
    {
        return ProdukJadwal::where('produk_id', $order->produk)->where('status', '!=', 'N')->exists();
    }

    /**
     * Pastikan order yang eligible punya qr_token, tanpa efek samping kirim
     * WA - aman dipanggil dari request GET/read (dipakai untuk "backfill"
     * token order lama yang Paid dari sebelum fitur ini ada, waktu customer
     * buka halaman tiket kehadirannya).
     */
    public function ensureToken(OrderCustomer $order): ?string
    {
        if (!$this->isEligible($order)) {
            return null;
        }

        if (!$order->qr_token) {
            $order->update(['qr_token' => $this->generateUniqueToken()]);
        }

        return $order->qr_token;
    }

    /**
     * Generate token (kalau belum ada) lalu kirim WA. Dipanggil dari titik
     * order BERUBAH jadi Paid saja (finance approve / callback payment
     * gateway) - bukan dari halaman baca biasa, supaya WA tidak
     * terkirim ulang tiap kali order lama dibuka/dihitung ke Halaman.
     * Aman dipanggil berkali-kali - WA tidak dikirim ulang kalau token
     * sudah pernah ada sebelumnya (berarti sudah pernah dikirim).
     */
    public function handlePaymentApproved(OrderCustomer $order): void
    {
        if (!$this->isEligible($order)) {
            return; // produk bukan tipe event/seminar, tidak butuh QR kehadiran
        }

        // Token sudah ada = WA tiket sudah pernah dikirim sebelumnya, jangan kirim ulang
        // (mis. dipanggil lagi karena webhook payment gateway retry).
        if ($order->qr_token) {
            return;
        }

        $order->update(['qr_token' => $this->generateUniqueToken()]);

        $customer = $order->customer_rel;
        if (!$customer || !$customer->wa) {
            Log::warning('AttendanceQrService: customer/WA tidak ditemukan, WA tiket tidak dikirim', [
                'order_id' => $order->id,
            ]);
            return;
        }

        $produkNama = $order->produk_rel->nama ?? 'produk Anda';
        $link = 'https://app.ternakproperti.com/customer/tiket-kehadiran';
        $message = "Halo {$customer->nama},\n\nPembayaran Anda untuk *{$produkNama}* sudah *LUNAS* ✅\n\nTiket QR kehadiran Anda sudah bisa didownload di member area:\n{$link}\n\nSilakan tunjukkan QR tersebut ke petugas kami saat check-in di lokasi acara. Sampai jumpa! 🙌";

        $woowaKey = $this->getWoowaKeyFromSales($customer);

        try {
            $waSender = app(WhatsAppSenderService::class);
            $response = $waSender->sendMessage($customer->wa, $message, null, $woowaKey);

            Log::info('AttendanceQrService: WA tiket QR kehadiran dikirim', [
                'order_id' => $order->id,
                'customer_id' => $customer->id,
                'successful' => $response->successful(),
            ]);
        } catch (\Throwable $e) {
            Log::error('AttendanceQrService: gagal kirim WA tiket QR kehadiran', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function generateUniqueToken(): string
    {
        do {
            $token = Str::random(40);
        } while (OrderCustomer::where('qr_token', $token)->exists());

        return $token;
    }

    /**
     * Sama seperti helper di controller lain (LogsFollupController/SendFollowupCron).
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();

        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        return env('WOOWA_KEY');
    }
}
