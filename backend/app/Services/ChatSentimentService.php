<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatSentimentService
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
            $response = Http::withToken(env('OPENAI_API_KEY'))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Kamu adalah AI yang mengklasifikasikan intent atau sentimen pesan chat pelanggan menjadi salah satu opsi berikut: negatif, warm, hot, atau neutral. Jawab HANYA dengan 1 kata dari opsi tersebut. \n- negatif: pesan marah, komplain, tidak tertarik, menolak.\n- warm: bertanya, ingin tahu, minta info lebih lanjut.\n- hot: siap beli, tanya harga akhir, minta nomor rekening, sepakat deal.\n- neutral: sapaan biasa, hal lain di luar konteks jual beli.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $message
                        ]
                    ],
                    'temperature' => 0,
                    'max_tokens' => 10
                ]);

            if ($response->successful()) {
                $intent = trim(strtolower($response['choices'][0]['message']['content'] ?? 'neutral'));
                
                // Pastikan output hanya nilai yang dizinkan
                if (!in_array($intent, ['negatif', 'warm', 'hot', 'neutral'])) {
                    $intent = 'neutral';
                }
                
                Log::channel('ai')->info('Chat sentiment classified', [
                    'message' => substr($message, 0, 100),
                    'sentiment' => $intent
                ]);
                
                return $intent;
            } else {
                Log::channel('ai')->error('Chat sentiment classification failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return 'neutral';
            }
        } catch (\Exception $e) {
            Log::channel('ai')->error('Chat sentiment classification error', [
                'error' => $e->getMessage(),
                'message' => substr($message, 0, 100)
            ]);
            
            return 'neutral';
        }
    }
}
