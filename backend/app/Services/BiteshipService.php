<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class BiteshipService
{
    private static function baseUrl(): string
    {
        return rtrim((string) config('services.biteship.base_url', 'https://api.biteship.com'), '/');
    }

    private static function apiKey(): string
    {
        $key = trim((string) config('services.biteship.key', ''));
        if ($key === '') {
            throw new \RuntimeException('BITESHIP_API_KEY belum di-set di .env backend');
        }
        return $key;
    }

    private static function client()
    {
        return Http::withHeaders([
            'authorization' => self::apiKey(),
            'accept' => 'application/json',
            'content-type' => 'application/json',
        ])->timeout(30);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function createOrder(array $payload): array
    {
        $res = self::client()->post(self::baseUrl() . '/v1/orders', $payload);
        $json = $res->json();
        if ($res->failed()) {
            $msg = is_array($json) ? ($json['message'] ?? $json['error'] ?? $res->body()) : $res->body();
            throw new \RuntimeException('Biteship create order gagal: ' . $msg);
        }
        return is_array($json) ? $json : [];
    }

    /**
     * @return array<string, mixed>
     */
    public static function getOrder(string $biteshipOrderId): array
    {
        $res = self::client()->get(self::baseUrl() . '/v1/orders/' . urlencode($biteshipOrderId));
        $json = $res->json();
        if ($res->failed()) {
            $msg = is_array($json) ? ($json['message'] ?? $json['error'] ?? $res->body()) : $res->body();
            throw new \RuntimeException('Biteship get order gagal: ' . $msg);
        }
        return is_array($json) ? $json : [];
    }

    /**
     * @return array<string, mixed>
     */
    public static function getTracking(string $trackingId): array
    {
        $res = self::client()->get(self::baseUrl() . '/v1/trackings/' . urlencode($trackingId));
        $json = $res->json();
        if ($res->failed()) {
            $msg = is_array($json) ? ($json['message'] ?? $json['error'] ?? $res->body()) : $res->body();
            throw new \RuntimeException('Biteship tracking gagal: ' . $msg);
        }
        return is_array($json) ? $json : [];
    }

    /**
     * Batalkan order Biteship yang sudah dibuat (mis. pengiriman salah/pengirim
     * berubah). Biteship tidak punya endpoint "update origin" - origin
     * permanen sejak order dibuat, jadi satu-satunya cara memperbaikinya
     * adalah batalkan lalu buat order baru dengan origin yang benar.
     *
     * @return array<string, mixed>
     */
    public static function cancelOrder(string $biteshipOrderId, string $reason = 'Dibatalkan dari sistem'): array
    {
        $res = self::client()->post(self::baseUrl() . '/v1/orders/' . urlencode($biteshipOrderId) . '/cancel', [
            'cancellation_reason' => $reason,
        ]);
        $json = $res->json();
        if ($res->failed()) {
            $msg = is_array($json) ? ($json['message'] ?? $json['error'] ?? $res->body()) : $res->body();
            throw new \RuntimeException('Biteship cancel order gagal: ' . $msg);
        }
        return is_array($json) ? $json : [];
    }

    /**
     * Ambil URL label/resi PDF dari Biteship.
     *
     * @return array<string, mixed>  berisi 'label_url' jika tersedia
     */
    public static function getLabel(string $biteshipOrderId): array
    {
        $res = self::client()->get(self::baseUrl() . '/v1/orders/' . urlencode($biteshipOrderId) . '/label');
        $json = $res->json();
        if ($res->failed()) {
            $msg = is_array($json) ? ($json['message'] ?? $json['error'] ?? $res->body()) : $res->body();
            throw new \RuntimeException('Biteship get label gagal: ' . $msg);
        }
        return is_array($json) ? $json : [];
    }
}
