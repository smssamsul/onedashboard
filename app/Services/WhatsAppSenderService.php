<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\SalesSetting;
use App\Models\Sales;
use App\Services\BaileysService;

class WhatsAppSenderService
{
    protected BaileysService $baileysService;

    public function __construct(BaileysService $baileysService)
    {
        $this->baileysService = $baileysService;
    }

    /**
     * Kirim pesan WhatsApp secara dinamis (Woowa / Baileys)
     *
     * @param string $to          Nomor tujuan
     * @param string $message     Pesan teks
     * @param int|null $salesId   ID Sales (opsional, untuk mendapatkan session Baileys per-sales)
     * @param string|null $woowaKey Woowa key (jika menggunakan Woowa)
     * @param bool $async         Gunakan async (khusus Woowa)
     * @return \Illuminate\Http\Client\Response|array|false
     * @throws \Exception
     */
    public function sendMessage(
        string $to,
        string $message,
        ?int $salesId = null,
        ?string $woowaKey = null,
        bool $async = false
    ) {
        $engine = SalesSetting::getWaEngine(); // 'woowa' | 'baileys'

        if ($engine === 'baileys') {
            return $this->sendViaBaileys($to, $message, $salesId);
        }

        return $this->sendViaWoowa($to, $message, $woowaKey, $async);
    }

    /**
     * Kirim menggunakan Woowa Gateway
     */
    protected function sendViaWoowa(string $to, string $message, ?string $woowaKey, bool $async = false)
    {
        $key = $woowaKey ?? env('WOOWA_KEY');

        if (!$key) {
            Log::channel('woowa')->warning('Woowa Key tidak ditemukan');
            return false;
        }

        $endpoint = $async ? 'https://notifapi.com/async_send_message' : 'https://notifapi.com/send_message';

        $response = Http::asJson()
            ->withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])
            ->timeout(30)
            ->post($endpoint, [
                'phone_no' => $to,
                'key'      => $key,
                'message'  => $message,
            ]);

        return $response;
    }

    /**
     * Kirim menggunakan Baileys
     */
    protected function sendViaBaileys(string $to, string $message, ?int $salesId = null)
    {
        $sessionId = 'global';

        if ($salesId) {
            $sales = Sales::where('id', $salesId)->orWhere('user_id', $salesId)->first();
            if ($sales && $sales->baileys_session_id) {
                $sessionId = $sales->baileys_session_id;
            } else if ($sales) {
                $sessionId = "sales_{$sales->user_id}";
            } else {
                $sessionId = "sales_{$salesId}";
            }
        }

        // Cek status session
        $status = $this->baileysService->getStatus($sessionId);
        
        if (!isset($status['status']) || !in_array($status['status'], ['open', 'connected'])) {
            Log::channel('woowa')->warning("Baileys session '{$sessionId}' tidak terhubung (status: " . ($status['status'] ?? 'unknown') . "). Fallback behavior: pesan gagal dikirim.");
            // Berdasarkan permintaan user: fallback behavior sementara pesan gagal dulu
            throw new \Exception("Baileys session '{$sessionId}' tidak terhubung.");
        }

        $response = $this->baileysService->sendMessage($sessionId, $to, $message);
        
        if (isset($response['success']) && $response['success']) {
            return $this->createMockResponse(true, 200, $response);
        }

        throw new \Exception("Gagal mengirim via Baileys: " . json_encode($response));
    }

    /**
     * Membuat mock response object agar kompatibel dengan balikan Http Laravel
     */
    protected function createMockResponse(bool $isSuccess, int $status, array $data)
    {
        return new class($isSuccess, $status, $data) {
            private $isSuccess;
            private $status;
            private $data;

            public function __construct($isSuccess, $status, $data) {
                $this->isSuccess = $isSuccess;
                $this->status = $status;
                $this->data = $data;
            }

            public function successful() {
                return $this->isSuccess;
            }

            public function status() {
                return $this->status;
            }

            public function json() {
                return $this->data;
            }

            public function body() {
                return json_encode($this->data);
            }
        };
    }
}
