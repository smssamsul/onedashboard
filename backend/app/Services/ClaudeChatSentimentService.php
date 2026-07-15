<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClaudeChatSentimentService
{
    /**
     * Classify chat intent/sentiment.
     * 
     * @param string $message
     * @return string (negatif, warm, hot, neutral)
     */
    public function classify($message)
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => env('ANTHROPIC_API_KEY'),
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json'
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-haiku-4-5-20251001',
                'system' => "Kamu adalah AI yang mengklasifikasikan intent atau sentimen pesan chat pelanggan menjadi salah satu opsi berikut: negatif, warm, hot, atau neutral. Jawab HANYA dengan 1 kata dari opsi tersebut.\n- negatif: pesan marah, komplain, tidak tertarik, menolak.\n- warm: bertanya, ingin tahu, minta info lebih lanjut.\n- hot: siap beli, tanya harga akhir, minta nomor rekening, sepakat deal.\n- neutral: sapaan biasa, hal lain di luar konteks jual beli.",
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => $message
                    ]
                ],
                'temperature' => 0,
                'max_tokens' => 10
            ]);

            if ($response->successful()) {
                $intent = trim(strtolower($response->json('content.0.text') ?? 'neutral'));
                
                // Pastikan output hanya nilai yang dizinkan
                if (!in_array($intent, ['negatif', 'warm', 'hot', 'neutral'])) {
                    $intent = 'neutral';
                }
                
                Log::channel('ai')->info('Claude Chat sentiment classified', [
                    'message' => substr($message, 0, 100),
                    'sentiment' => $intent
                ]);
                
                return $intent;
            } else {
                Log::channel('ai')->error('Claude Chat sentiment classification failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return 'neutral';
            }
        } catch (\Exception $e) {
            Log::channel('ai')->error('Claude Chat sentiment classification error', [
                'error' => $e->getMessage(),
                'message' => substr($message, 0, 100)
            ]);
            
            return 'neutral';
        }
    }
}
