<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ClaudeIntentClassifierService
{
    public function classify($message)
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => env('ANTHROPIC_API_KEY'),
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json'
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-haiku-4-5-20251001',
                'system' => 'Kamu adalah intent classifier. Jawab hanya 1 kata dari opsi berikut: workshop, mentoring, jasa_ads, tidak_jelas.',
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
                $intent = trim($response->json('content.0.text') ?? 'tidak_jelas');
                
                Log::info('Intent classified by Claude', [
                    'message' => substr($message, 0, 100),
                    'intent' => $intent
                ]);
                
                return $intent;
            } else {
                Log::error('Claude Intent classification failed', [
                    'status' => $response->status(),
                    'body' => $response->body()
                ]);
                
                return 'tidak_jelas';
            }
        } catch (\Exception $e) {
            Log::error('Claude Intent classification error', [
                'error' => $e->getMessage(),
                'message' => substr($message, 0, 100)
            ]);
            
            return 'tidak_jelas';
        }
    }
}
