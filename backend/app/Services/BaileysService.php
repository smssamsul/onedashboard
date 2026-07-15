<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BaileysService
{
    private string $baseUrl;
    private string $apiKey;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim(env('BAILEYS_URL', 'http://localhost:3001'), '/');
        $this->apiKey  = env('BAILEYS_API_KEY', 'testlimit123');
        $this->timeout = 10;
    }

    /**
     * Headers wajib untuk setiap request ke Baileys server.
     */
    private function headers(): array
    {
        return [
            'x-api-key'    => $this->apiKey,
            'Content-Type' => 'application/json',
        ];
    }

    /**
     * Buat URL lengkap ke Baileys API.
     */
    private function url(string $path): string
    {
        return $this->baseUrl . '/api/wa/' . ltrim($path, '/');
    }

    // -------------------------------------------------------------------------
    // Session Management
    // -------------------------------------------------------------------------

    /**
     * List semua session aktif di Baileys server.
     *
     * @return array{success: bool, sessions: array}
     */
    public function listSessions(): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout($this->timeout)
                ->get($this->url('sessions'));

            return $response->json() ?? ['success' => false, 'sessions' => []];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] listSessions error: ' . $e->getMessage());
            return ['success' => false, 'sessions' => [], 'message' => $e->getMessage()];
        }
    }

    /**
     * Buat session baru di Baileys server.
     *
     * @param  string $sessionId  Format: sales_{id}
     * @return array{success: bool, message: string}
     */
    public function createSession(string $sessionId): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout($this->timeout)
                ->post($this->url('sessions'), [
                    'sessionId' => $sessionId,
                ]);

            return $response->json() ?? ['success' => false, 'message' => 'No response'];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] createSession error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Cek status koneksi suatu session.
     *
     * @param  string $sessionId
     * @return array{success: bool, status: string}
     *         status: 'open' | 'qr' | 'connecting' | 'close' | 'not_found'
     */
    public function getStatus(string $sessionId): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout($this->timeout)
                ->get($this->url("{$sessionId}/status"));

            if ($response->status() === 404) {
                return ['success' => false, 'status' => 'not_found'];
            }

            return $response->json() ?? ['success' => false, 'status' => 'unknown'];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] getStatus error: ' . $e->getMessage());
            return ['success' => false, 'status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Ambil QR code (hanya tersedia jika status = 'qr').
     *
     * @param  string $sessionId
     * @return array{success: bool, qr: string|null, message: string|null}
     *         qr: string QR data (bisa berupa base64 image atau raw QR string)
     */
    public function getQr(string $sessionId): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout($this->timeout)
                ->get($this->url("{$sessionId}/qr"));

            if ($response->status() === 404) {
                return ['success' => false, 'qr' => null, 'message' => 'Session not found'];
            }

            return $response->json() ?? ['success' => false, 'qr' => null];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] getQr error: ' . $e->getMessage());
            return ['success' => false, 'qr' => null, 'message' => $e->getMessage()];
        }
    }

    /**
     * Logout / hapus session.
     *
     * @param  string $sessionId
     * @return array{success: bool, message: string}
     */
    public function logout(string $sessionId): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout($this->timeout)
                ->delete($this->url("sessions/{$sessionId}"));

            return $response->json() ?? ['success' => false, 'message' => 'No response'];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] logout error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Messaging
    // -------------------------------------------------------------------------

    /**
     * Kirim pesan teks via Baileys.
     *
     * @param  string $sessionId
     * @param  string $number    Nomor WA tujuan (format: 628xxx)
     * @param  string $message   Isi pesan
     * @return array{success: bool, message: string|null}
     */
    public function sendMessage(string $sessionId, string $number, string $message): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post($this->url("{$sessionId}/send-message"), [
                    'number'  => $number,
                    'message' => $message,
                ]);

            return $response->json() ?? ['success' => false, 'message' => 'No response'];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] sendMessage error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    /**
     * Kirim gambar + caption via Baileys.
     *
     * @param  string $sessionId
     * @param  string $number    Nomor WA tujuan
     * @param  string $image     URL atau base64 gambar
     * @param  string $caption   Caption gambar
     * @return array{success: bool, message: string|null}
     */
    public function sendImage(string $sessionId, string $number, string $image, string $caption = ''): array
    {
        try {
            $response = Http::withHeaders($this->headers())
                ->timeout(30)
                ->post($this->url("{$sessionId}/send-image"), [
                    'number'  => $number,
                    'image'   => $image,
                    'message' => $caption,
                ]);

            return $response->json() ?? ['success' => false, 'message' => 'No response'];
        } catch (\Throwable $e) {
            Log::error('[BaileysService] sendImage error: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    /**
     * Generate session ID standar untuk sales.
     * Format: sales_{id}
     */
    public static function makeSessionId(int $salesId): string
    {
        return 'sales_' . $salesId;
    }
}
