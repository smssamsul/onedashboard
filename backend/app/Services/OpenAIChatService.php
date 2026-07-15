<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;
use Illuminate\Support\Facades\Log;
use App\Models\AiSetting;

class OpenAIChatService
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
                // Use prompt_cold for cold leads
                $systemPrompt = $aiSetting->prompt_cold;
                Log::info('OpenAIChatService: Using prompt_cold', [
                    'lead_status' => $status,
                ]);
            } elseif ($status === 'warm' && !empty($aiSetting->prompt_warm)) {
                // Use prompt_warm for warm leads
                $systemPrompt = $aiSetting->prompt_warm;
                Log::info('OpenAIChatService: Using prompt_warm', [
                    'lead_status' => $status,
                ]);
            } elseif (in_array($status, ['new', 'lead']) && !empty($aiSetting->prompt)) {
                // Use default prompt for new/lead status
                $systemPrompt = $aiSetting->prompt;
                Log::info('OpenAIChatService: Using default prompt', [
                    'lead_status' => $status,
                ]);
            }
        }
        
        // Fallback to config if no prompt found
        if (!$systemPrompt && $aiSetting) {
            $systemPrompt = $aiSetting->prompt;
            Log::info('OpenAIChatService: Using config prompt', [
                'lead_status' => $leadStatus,
            ]);
        }

        $response = OpenAI::chat()->create([
            'model' => 'gpt-4o-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' => $systemPrompt,
                ],
                [
                    'role' => 'user',
                    'content' => "Materi:\n$prompt\n\nPertanyaan:\n$question\n\nJawab singkat saja."
                ],
            ],
        ]);

        Log::info('OpenAIChatService', [
            'question' => $question,
            'contexts' => $contexts,
            'lead_status' => $leadStatus,
            'prompt_used' => substr($systemPrompt, 0, 100) . '...',
            'response' => $response->choices[0]->message->content
        ]);

        return $response->choices[0]->message->content;
    }
}
