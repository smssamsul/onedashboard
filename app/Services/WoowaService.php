<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\AiSetting;

class WoowaService
{
    protected $waSender;

    public function __construct(\App\Services\WhatsAppSenderService $waSender)
    {
        $this->waSender = $waSender;
    }

    /**
     * Kirim pesan WhatsApp menggunakan Woowa (atau Baileys bergantung engine global)
     *
     * @param string $to Nomor tujuan (format internasional, misal 628xxxx)
     * @param string $message Pesan teks
     * @return bool
     */
    public function sendMessage(string $to, string $message): bool
    {
        // Ambil woowa_key global dari AI Setting (jika menggunakan Woowa)
        $setting = AiSetting::first();
        $woowaKey = $setting?->woowa_key;

        try {
            // Karena ini dipanggil dari AI/sistem general, kita asumsikan tidak terkait sales (salesId = null)
            // Jadi akan pakai global session jika engine = baileys.
            // Gunakan mode async sesuai legacy code WoowaService ('https://notifapi.com/async_send_message').
            $response = $this->waSender->sendMessage($to, $message, null, $woowaKey, true);

            // Karena respon bisa berupa Http Response dari Laravel (Woowa) atau Array (Baileys)
            if (is_array($response) && isset($response['success']) && $response['success']) {
                return true;
            } elseif ($response instanceof \Illuminate\Http\Client\Response) {
                return $response->successful();
            }

            return false;
        } catch (\Throwable $e) {
            Log::channel('woowa')->error('WoowaService sendMessage error', [
                'to' => $to,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }
}

