<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class UltraMsgService
{
    protected ?string $instanceId;
    protected ?string $token;

    public function __construct()
    {
        $this->instanceId = config('services.ultramsg.instance_id');
        $this->token      = config('services.ultramsg.token');

        // Validate required config
        if (empty($this->instanceId) || empty($this->token)) {
            throw new \RuntimeException(
                'UltraMsg configuration is missing. Please set ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN in your .env file.'
            );
        }
    }

    public function sendMessage(string $to, string $message): bool
    {
        $response = Http::asForm()
            ->withOptions([
                'verify' => false,
            ])
            ->post(
                "https://api.ultramsg.com/{$this->instanceId}/messages/chat",
                [
                    'token' => $this->token,
                    'to'    => $to,
                    'body'  => $message,
                ]
            );

        return $response->successful();
    }
}
