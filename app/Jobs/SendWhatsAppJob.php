<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendWhatsAppJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3; // Maksimal 3x retry jika gagal
    public $timeout = 60; // Timeout 60 detik

    /**
     * Create a new job instance.
     */
    public function __construct(
        public string $phoneNo,
        public string $message,
        public string $woowaKey
    ) {
        // Konfigurasi queue (opsional)
        // $this->onQueue('whatsapp'); // Nama queue spesifik
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            Log::info('Mengirim WhatsApp via Queue', [
                'phone' => $this->phoneNo,
                'message' => substr($this->message, 0, 50) . '...'
            ]);

            $response = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->timeout(30)
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $this->phoneNo,
                    'key'      => $this->woowaKey,
                    'message'  => $this->message,
                ]);

            if ($response->successful()) {
                Log::info('WhatsApp berhasil dikirim via Queue', [
                    'phone' => $this->phoneNo,
                    'response' => $response->json()
                ]);
            } else {
                Log::error('Gagal kirim WhatsApp via Queue', [
                    'phone' => $this->phoneNo,
                    'status' => $response->status(),
                    'response' => $response->json()
                ]);
                
                // Throw exception agar job di-retry
                throw new \Exception('Gagal mengirim WhatsApp: HTTP ' . $response->status());
            }

        } catch (\Exception $e) {
            Log::error('Error di SendWhatsAppJob', [
                'phone' => $this->phoneNo,
                'error' => $e->getMessage()
            ]);
            
            // Re-throw agar job di-retry
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SendWhatsAppJob gagal setelah semua retry', [
            'phone' => $this->phoneNo,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}

