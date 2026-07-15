<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\AiSetting;

class ClaudeChatService
{
    public function reply(string $question, array $contexts, ?string $leadStatus = null): string
    {
        $prompt = implode("\n", $contexts);

        // Get prompt from database based on lead status
        $aiSetting = AiSetting::first();
        $systemPrompt = null;
        
        if ($aiSetting) {
            // Select prompt based on lead status
            $status = strtolower(trim($leadStatus ?? 'new'));
            
            if ($status === 'cold' && !empty($aiSetting->prompt_cold)) {
                $systemPrompt = $aiSetting->prompt_cold;
                Log::channel('ai')->info('ClaudeChatService: Using prompt_cold', ['lead_status' => $status]);
            } elseif ($status === 'warm' && !empty($aiSetting->prompt_warm)) {
                $systemPrompt = $aiSetting->prompt_warm;
                Log::channel('ai')->info('ClaudeChatService: Using prompt_warm', ['lead_status' => $status]);
            } elseif (in_array($status, ['new', 'lead']) && !empty($aiSetting->prompt)) {
                $systemPrompt = $aiSetting->prompt;
                Log::channel('ai')->info('ClaudeChatService: Using default prompt', ['lead_status' => $status]);
            }
        }
        
        // Fallback to config if no prompt found
        if (!$systemPrompt && $aiSetting) {
            $systemPrompt = $aiSetting->prompt;
            Log::channel('ai')->info('ClaudeChatService: Using config prompt', ['lead_status' => $leadStatus]);
        }

        $response = Http::withHeaders([
            'x-api-key' => env('ANTHROPIC_API_KEY'),
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json'
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'system' => $systemPrompt ?? '',
            'messages' => [
                [
                    'role' => 'user',
                    'content' => "Materi:\n$prompt\n\nPertanyaan:\n$question\n\nJawab singkat saja."
                ]
            ],
            'max_tokens' => 1024,
        ]);

        if ($response->failed()) {
            Log::channel('ai')->error('Claude API Error', [
                'status' => $response->status(),
                'body'   => $response->json()
            ]);
            $replyMessage = '';
        } else {
            $replyMessage = $response->json('content.0.text') ?? '';
        }


        Log::channel('ai')->info('ClaudeChatService', [
            'question' => $question,
            'contexts' => $contexts,
            'lead_status' => $leadStatus,
            'prompt_used' => substr((string)$systemPrompt, 0, 100) . '...',
            'response' => $replyMessage
        ]);

        return $replyMessage;
    }
}
