<?php

namespace App\Services;

use App\Http\Controllers\Api\Sales\OrderCustomerController;
use App\Models\LeadLpwa;
use App\Models\OrderCustomer;
use App\Models\Produk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Konversi otomatis lead LPWA jadi order - HANYA kalau semua syarat presisi
 * terpenuhi: nama, sumber, produk yang diminati, dan lokasi terisi lengkap;
 * format nama wajar (bukan cuma "Kak"/emoji/simbol aneh); sumber-nya PERSIS
 * salah satu kode di SUMBER_DIIZINKAN (pilot dimulai dari "Meta Ads v16"
 * saja - kode lain sengaja belum diikutkan sampai terbukti aman); dan
 * gabungan "{produk_text} {lokasi}" cocok PERSIS (exact match,
 * case-insensitive, abai spasi berlebih) ke satu nama produk AKTIF di
 * katalog.
 *
 * Kalau ragu sedikit pun (sumber bukan yang diizinkan, produk tidak
 * ketemu/ambigu, atau data belum lengkap), lead dibiarkan apa adanya - sales
 * tetap proses manual lewat tombol "+ Order" yang sudah ada. Lihat juga
 * catatan di LpwaWebhookController soal kenapa auto-matching produk
 * sebelumnya sengaja dilepas (lead yang tidak match dulu malah dibuang) -
 * service ini tidak mengulang itu: gagal cocok = tidak melakukan apa-apa,
 * lead tetap tersimpan.
 */
class LeadAutoOrderService
{
    /** Kode sumber yang boleh dikonversi otomatis - lihat docblock class. */
    private const SUMBER_DIIZINKAN = ['Meta Ads v16'];

    public function tryConvert(LeadLpwa $lead): ?OrderCustomer
    {
        try {
            return $this->attempt($lead);
        } catch (\Throwable $e) {
            Log::channel('webhook_baileys')->error('Gagal auto-convert lead ke order', [
                'lead_id' => $lead->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    private function attempt(LeadLpwa $lead): ?OrderCustomer
    {
        $nama = trim((string) $lead->nama);
        $noWa = trim((string) $lead->no_wa);
        $produkText = trim((string) $lead->produk_text);
        $lokasi = trim((string) $lead->lokasi);
        $sumber = trim((string) $lead->sumber);

        if ($nama === '' || $noWa === '' || $produkText === '' || $lokasi === '' || $sumber === '') {
            return null;
        }

        if (!$this->isSumberDiizinkan($sumber)) {
            return null;
        }

        if (!$this->isValidNameFormat($nama)) {
            return null;
        }

        // Sudah punya order aktif? Jangan buat lagi - cek sama seperti
        // LeadLpwaController::index untuk status order_exists.
        $sudahAdaOrder = OrderCustomer::whereHas('customer_rel', function ($q) use ($noWa) {
                $q->where('wa', $noWa);
            })
            ->whereNotIn('status_order', ['3', '3 '])
            ->where('status', '!=', 'N')
            ->exists();
        if ($sudahAdaOrder) {
            return null;
        }

        $namaProdukDicari = preg_replace('/\s+/', ' ', trim($produkText . ' ' . $lokasi));
        $matches = Produk::where('status', '!=', 'N')
            ->whereRaw('LOWER(TRIM(nama)) = LOWER(?)', [$namaProdukDicari])
            ->get(['id', 'nama', 'harga_asli']);

        if ($matches->count() !== 1) {
            // Tidak ketemu atau ambigu - jangan tebak, biarkan diproses manual.
            return null;
        }
        $produk = $matches->first();

        $totalHarga = (string) ((float) ($produk->harga_asli ?? 0));

        $syntheticRequest = Request::create('/api/sales/order-admin', 'POST', [
            'nama' => $nama,
            'wa' => $noWa,
            'produk' => $produk->id,
            'harga' => $totalHarga,
            'ongkir' => '0',
            'total_harga' => $totalHarga,
            // Sengaja beda dari "sales_quick_order" (yang dipakai flow manual)
            // supaya order hasil auto-convert ini tetap bisa dibedakan/diaudit.
            'sumber' => 'lead_auto_masuk',
            'notif' => 1,
        ]);
        $syntheticRequest->headers->set('Accept', 'application/json');

        $response = app(OrderCustomerController::class)->store_admin($syntheticRequest);
        $payload = $response->getData(true);

        if (!($payload['success'] ?? false)) {
            Log::channel('webhook_baileys')->warning('Auto-convert lead ke order ditolak store_admin', [
                'lead_id' => $lead->id,
                'produk_id' => $produk->id,
                'response' => $payload,
            ]);
            return null;
        }

        $orderId = $payload['data']['order']['id'] ?? null;

        Log::channel('webhook_baileys')->info('Lead otomatis dikonversi jadi order', [
            'lead_id' => $lead->id,
            'produk_id' => $produk->id,
            'produk_nama' => $produk->nama,
            'order_id' => $orderId,
        ]);

        return $orderId ? OrderCustomer::find($orderId) : null;
    }

    /**
     * Nama wajar = huruf (termasuk beraksen), spasi, dan tanda baca umum
     * saja. Tolak kalau ada emoji, digit, underscore, atau simbol lain -
     * itu biasanya artefak nama akun WA, bukan nama orang yang valid.
     */
    private function isValidNameFormat(string $nama): bool
    {
        if (mb_strlen($nama) < 2) {
            return false;
        }

        return (bool) preg_match('/^[\p{L}\s.,\'-]+$/u', $nama);
    }

    /** Cocok persis (case-insensitive) ke salah satu SUMBER_DIIZINKAN. */
    private function isSumberDiizinkan(string $sumber): bool
    {
        foreach (self::SUMBER_DIIZINKAN as $izin) {
            if (strcasecmp($sumber, $izin) === 0) {
                return true;
            }
        }
        return false;
    }
}
