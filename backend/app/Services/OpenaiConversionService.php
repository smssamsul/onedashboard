<?php

namespace App\Services;

use App\Models\OpenaiPixel;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Kirim event konversi ke OpenAI Ads Conversions API (server-side), sebagai
 * pendamping pixel browser (oaiq). Event yang sama dari browser & server
 * wajib memakai `id` yang sama supaya di-dedup oleh OpenAI.
 *
 * Referensi: https://developers.openai.com/ads/conversions-api
 */
class OpenaiConversionService
{
    private const ENDPOINT = 'https://bzr.openai.com/v1/events';

    /**
     * OpenAI minta `amount` berupa integer dalam satuan minor mata uang
     * (contoh di dokumentasi: 2599 = USD 25,99). IDR menurut ISO 4217 punya
     * 2 digit minor, jadi Rp 150.000 dikirim sebagai 15000000. Kalau nanti
     * di Ads Manager nilainya terlihat 100x lipat, cukup ubah angka ini
     * (dan AMOUNT_MULTIPLIER di frontend-tp/src/lib/openaiPixel.js).
     */
    public const AMOUNT_MULTIPLIER = 100;

    public static function amount($rupiah): int
    {
        return (int) round(((float) $rupiah) * self::AMOUNT_MULTIPLIER);
    }

    public static function hashEmail(?string $email): ?string
    {
        $email = strtolower(trim((string) $email));
        // Email placeholder quick order (order_62xxx@quickorder.local) bukan email asli customer.
        if ($email === '' || !str_contains($email, '@') || str_ends_with($email, '.local')) {
            return null;
        }

        return hash('sha256', $email);
    }

    /** Aturan OpenAI: buang +, nol di depan, spasi & tanda baca; kode negara tetap ada (8-15 digit). */
    public static function hashPhone(?string $phone): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);
        if (str_starts_with($digits, '0')) {
            $digits = '62' . ltrim($digits, '0');
        }
        if (strlen($digits) < 8 || strlen($digits) > 15) {
            return null;
        }

        return hash('sha256', $digits);
    }

    /**
     * @return array{ok: bool, status: int|null, body: string}
     */
    public function kirim(OpenaiPixel $pixel, array $event, bool $validateOnly = false): array
    {
        $key = $pixel->capi_key;
        if (empty($key)) {
            return ['ok' => false, 'status' => null, 'body' => 'Conversions API key belum diisi'];
        }

        try {
            $response = Http::withToken($key)
                ->acceptJson()
                ->timeout(5)
                ->post(self::ENDPOINT . '?pid=' . urlencode($pixel->pixel_id), [
                    'validate_only' => $validateOnly,
                    'integration_source' => 'onedashboard',
                    'events' => [$event],
                ]);

            $hasil = ['ok' => $response->successful(), 'status' => $response->status(), 'body' => mb_substr($response->body(), 0, 1000)];
        } catch (\Throwable $e) {
            $hasil = ['ok' => false, 'status' => null, 'body' => 'Error: ' . $e->getMessage()];
        }

        if (!$hasil['ok']) {
            Log::warning('OpenAI Conversions API gagal', [
                'pixel_id' => $pixel->pixel_id,
                'event_type' => $event['type'] ?? null,
                'status' => $hasil['status'],
                'body' => $hasil['body'],
            ]);
        }

        return $hasil;
    }
}
