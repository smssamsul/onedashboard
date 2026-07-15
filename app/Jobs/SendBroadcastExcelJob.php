<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\BroadcastPenerima;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;

class SendBroadcastExcelJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $broadcastId,
        public string $message,
        public string $woowaKey,
        public string $phone,
        public string $nama,
        public ?int $userId = null
    ) {
        $this->onQueue('broadcast');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $response = null;
        $responseData = null;

        try {
            // Prepare data for template rendering
            $templateData = [
                'customer_name' => $this->nama,
            ];

            try {
                $renderedMessage = TemplateHelper::render($this->message, $templateData);
            } catch (\Exception $renderError) {
                Log::channel('broadcast')->error('Error rendering broadcast excel message', [
                    'broadcast_id' => $this->broadcastId,
                    'error' => $renderError->getMessage(),
                ]);
                $renderedMessage = $this->message;
            }

            Log::channel('broadcast')->info('Mengirim Broadcast Excel via Queue', [
                'broadcast_id' => $this->broadcastId,
                'phone' => $this->phone,
            ]);

            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $response = $waSender->sendMessage($this->phone, $renderedMessage, null, $this->woowaKey);

            if ($response->successful()) {
                $this->saveBroadcastPenerima(
                    $this->phone,
                    '1',
                    json_encode($response->json()),
                    $renderedMessage
                );
            } else {
                Log::channel('broadcast')->error('Gagal mengirim Broadcast Excel via API', [
                    'broadcast_id' => $this->broadcastId,
                    'phone' => $this->phone,
                    'status_or_response' => $response->status(),
                    'response_json' => $response->json(),
                    'woowa_key' => $this->woowaKey,
                ]);

                $this->saveBroadcastPenerima(
                    $this->phone,
                    '0',
                    json_encode($response->json() ?? ['error' => 'Gagal via WA Sender', 'status' => $response->status()]),
                    $renderedMessage
                );
                throw new \Exception('Gagal mengirim Broadcast Excel: ' . json_encode($response->json()));
            }

        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Error di SendBroadcastExcelJob', [
                'broadcast_id' => $this->broadcastId,
                'phone' => $this->phone,
                'error' => $e->getMessage()
            ]);
            $this->saveBroadcastPenerima($this->phone, '0', json_encode(['error' => $e->getMessage()]), $this->message);
            throw $e;
        }
    }

    private function saveBroadcastPenerima(string $notelp, string $status, ?string $response = null, ?string $renderedMessage = null): void
    {
        try {
            $pesanToSave = $renderedMessage ?? $this->message;
            
            BroadcastPenerima::create([
                'broadcast' => $this->broadcastId,
                'user' => $this->userId,
                'customer' => null,
                'notelp' => $notelp,
                'pesan' => $pesanToSave,
                'response' => $response,
                'status' => $status,
                'send_at' => now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Gagal menyimpan broadcast_penerima excel', [
                'error' => $e->getMessage()
            ]);
        }
    }

    public function failed(\Throwable $exception): void
    {
        try {
            $existing = BroadcastPenerima::where('broadcast', $this->broadcastId)
                ->where('notelp', $this->phone)
                ->first();

            if (!$existing) {
                $templateData = ['customer_name' => $this->nama];
                $renderedMsg = $this->message;
                try {
                    $renderedMsg = TemplateHelper::render($this->message, $templateData);
                } catch (\Exception $e) {}

                $this->saveBroadcastPenerima(
                    $this->phone,
                    '0',
                    json_encode(['error' => $exception->getMessage(), 'failed_after_retry' => true]),
                    $renderedMsg
                );
            }
        } catch (\Exception $e) {}
    }
}
