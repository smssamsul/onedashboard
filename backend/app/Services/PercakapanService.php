<?php

namespace App\Services;

use App\Models\AiLead;
use App\Models\DetailPercakapan;
use App\Models\Percakapan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PercakapanService
{
    /**
     * Catat pesan masuk dari customer (WA gateway apapun - Baileys/Woowa)
     * ke tabel percakapan/detail_percakapan supaya muncul di menu
     * Percakapan (AI). Bikin thread baru berdasar nomor HP kalau belum
     * ada, ter-assign ke sales pemilik session WA yang nerima pesan itu.
     *
     * Logika penambahan pesan (sentiment, auto-update status lead) sengaja
     * disamakan dengan PercakapanController::addMessage() supaya perilaku
     * konsisten dari sumber manapun pesan customer masuk.
     */
    public function logCustomerMessage(
        string $phoneNumber,
        ?int $salesId,
        string $messageText,
        ?string $senderName = null,
        string $source = 'whatsapp'
    ): ?DetailPercakapan {
        $phoneNumber = trim($phoneNumber);
        $messageText = trim($messageText);

        if ($phoneNumber === '' || $messageText === '') {
            return null;
        }

        return DB::transaction(function () use ($phoneNumber, $salesId, $messageText, $source) {
            $percakapan = Percakapan::where('phone_number', $phoneNumber)->first();

            if (!$percakapan) {
                $percakapan = Percakapan::create([
                    'phone_number' => $phoneNumber,
                    'assigned_sales_id' => $salesId,
                    'status' => 'new',
                    'source' => $source,
                    'lead_score' => 0,
                ]);
            }

            $intent = null;
            try {
                $intent = app(ClaudeChatSentimentService::class)->classify($messageText);
            } catch (\Throwable $e) {
                Log::warning('PercakapanService: gagal klasifikasi sentiment', [
                    'phone_number' => $phoneNumber,
                    'error' => $e->getMessage(),
                ]);
            }

            $detail = DetailPercakapan::create([
                'id_percakapan' => $percakapan->id,
                'sender_type' => 'customer',
                'message_text' => $messageText,
                'message_type' => 'text',
                'intent' => $intent,
                'created_at' => now(),
            ]);

            $percakapan->update(['last_message_at' => now()]);

            // Sama seperti PercakapanController::addMessage(): begitu ada
            // 2-3 pesan, otomatis naikkan status lead dari "new" ke "lead".
            $messageCount = DetailPercakapan::where('id_percakapan', $percakapan->id)->count();
            if ($messageCount >= 2 && $messageCount <= 3) {
                $lead = AiLead::where('phone_number', $phoneNumber)->first();
                if ($lead) {
                    $currentStatus = strtolower(trim((string) ($lead->status ?? '')));
                    if (in_array($currentStatus, ['new', ''], true)) {
                        $lead->update(['status' => 'lead', 'updated_at' => now()]);
                    }
                }
            }

            return $detail;
        });
    }
}
