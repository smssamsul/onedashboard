<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class IntentClassifierService
{
    public function classify($message)
    {
        try {
            $response = Http::withToken(env('OPENAI_API_KEY'))
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => 'Kamu adalah intent classifier. Jawab hanya 1 kata dari opsi berikut: workshop, mentoring, jasa_ads, tidak_jelas.'
                        ],
                        [
                            'role' => 'user',
                            'content' => $message
                        ]
                    ],
                    'temperature' => 0,
                    'max_tokens' => 5
                ]);

            if ($response->successful()) {
                $intent = trim($response['choices'][0]['message']['content'] ?? 'tidak_jelas');
                
                Log::info('Intent classified', [
                    'message' => substr($message, 0, 100),
                    'intent' => $intent
                ]);
                
                return $intent;
            } else {
                Log::error('Intent classification failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return 'tidak_jelas';
            }
        } catch (\Exception $e) {
            Log::error('Intent classification error', [
                'error' => $e->getMessage(),
                'message' => substr($message, 0, 100)
            ]);
            
            return 'tidak_jelas';
        }
    }
}
