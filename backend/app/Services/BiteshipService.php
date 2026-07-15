<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class BiteshipService
{
    private static function baseUrl(): string
    {
        return rtrim((string) env('BITESHIP_BASE_URL', 'https://api.biteship.com'), '/');
    }

    private static function apiKey(): string
    {
        $key = trim((string) env('BITESHIP_API_KEY', ''));
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
