<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Carbon\Carbon;

class DokuServices
{
    protected $clientId;
    protected $secretKey;
    protected $baseUrl;

    public function __construct()
    {
        $this->clientId  = config('doku.client_id');
        $this->secretKey = config('doku.secret_key');
        $this->baseUrl   = config('doku.base_url');
    }

    /**
     * Hitung Digest: SHA256 base64 hash dari JSON body mentah.
     */
    public function generateDigest(string $rawJsonBody): string
    {
        return base64_encode(hash('sha256', $rawJsonBody, true));
    }

    /**
     * Susun komponen signature lalu HMAC-SHA256 pakai Secret Key,
     * hasilnya di-base64 dan diberi prefix "HMACSHA256=".
     */
    public function generateSignature(string $requestId, string $timestamp, string $requestTarget, string $digest): string
    {
        $componentSignature =
            "Client-Id:{$this->clientId}\n" .
            "Request-Id:{$requestId}\n" .
            "Request-Timestamp:{$timestamp}\n" .
            "Request-Target:{$requestTarget}\n" .
            "Digest:{$digest}";

        $hash = base64_encode(hash_hmac('sha256', $componentSignature, $this->secretKey, true));

        return "HMACSHA256={$hash}";
    }

    /**
     * Buat request pembayaran (DOKU Checkout) dan kembalikan payment.url + token_id.
     */
    public function createPayment(array $body, string $requestTarget = '/checkout/v1/payment'): array
    {
        $rawJsonBody = json_encode($body);
        $requestId   = (string) Str::uuid();
        $timestamp   = Carbon::now('UTC')->format('Y-m-d\TH:i:s\Z');
        $digest      = $this->generateDigest($rawJsonBody);
        $signature   = $this->generateSignature($requestId, $timestamp, $requestTarget, $digest);

        $response = Http::withHeaders([
            'Client-Id'          => $this->clientId,
            'Request-Id'         => $requestId,
            'Request-Timestamp'  => $timestamp,
            'Signature'          => $signature,
            'Content-Type'       => 'application/json',
        ])->withBody($rawJsonBody, 'application/json')
          ->post($this->baseUrl . $requestTarget);

        if (!$response->successful()) {
            throw new \Exception('DOKU createPayment gagal: ' . $response->body());
        }

        return $response->json();
    }

    /**
     * Verifikasi signature notifikasi (webhook) dari DOKU.
     */
    public function verifyNotificationSignature(string $clientId, string $requestId, string $timestamp, string $requestTarget, string $rawJsonBody, string $signatureHeader): bool
    {
        $digest = $this->generateDigest($rawJsonBody);

        $componentSignature =
            "Client-Id:{$clientId}\n" .
            "Request-Id:{$requestId}\n" .
            "Request-Timestamp:{$timestamp}\n" .
            "Request-Target:{$requestTarget}\n" .
            "Digest:{$digest}";

        $hash = base64_encode(hash_hmac('sha256', $componentSignature, $this->secretKey, true));
        $expectedSignature = "HMACSHA256={$hash}";

        return hash_equals($expectedSignature, $signatureHeader);
    }
}
