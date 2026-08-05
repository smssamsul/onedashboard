<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use App\Models\LogsFollup;

class SendFollowupMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    public function __construct(
        public string $templateType,
        public ?int $templateId,
        public string $message,
        public string $phone,
        public string $customerNama,
        public int $customerId,
        public ?int $orderId = null,
        public ?int $invitationId = null,
        public ?int $salesId = null,
        public ?string $woowaKey = null,
    ) {
        $this->onQueue('followup');
    }

    public function handle(): void
    {
        $isInvitation = $this->invitationId !== null;
        $label = $isInvitation ? 'reminder invitation' : 'follow up';

        try {
            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $response = $waSender->sendMessage($this->phone, $this->message, $this->salesId, $this->woowaKey);

            $statusText = $response->successful() ? 'sukses' : 'gagal';
            $keterangan = "Kirim WA {$label} type {$this->templateType} ke {$this->phone} ({$this->customerNama}). Status: {$statusText}. Pesan: {$this->message}";

            $responseData = $response->json();
            $responseText = is_array($responseData) ? json_encode($responseData) : (string) $response->body();
            $keterangan .= "\nResponse: {$responseText}";

            LogsFollup::create([
                'follup'     => $this->templateId,
                'customer'   => $this->customerId,
                'order'      => $this->orderId,
                'invitation' => $this->invitationId,
                'type'       => $this->templateType,
                'keterangan' => $keterangan,
                'create_at'  => now(),
                'status'     => $response->successful() ? '1' : '0',
            ]);

            if ($response->successful()) {
                Log::channel('followup')->info("Pesan berhasil dikirim", [
                    'customer_id' => $this->customerId,
                    'customer_nama' => $this->customerNama,
                    'customer_wa' => $this->phone,
                    'template_id' => $this->templateId,
                    'template_type' => $this->templateType,
                    'response_status' => $response->status(),
                ]);
            } else {
                Log::channel('followup')->error("Pesan gagal dikirim", [
                    'customer_id' => $this->customerId,
                    'customer_nama' => $this->customerNama,
                    'customer_wa' => $this->phone,
                    'template_id' => $this->templateId,
                    'template_type' => $this->templateType,
                    'response_status' => $response->status(),
                    'response_body' => $response->body(),
                ]);
            }
        } catch (\Exception $e) {
            LogsFollup::create([
                'follup'     => $this->templateId,
                'customer'   => $this->customerId,
                'order'      => $this->orderId,
                'invitation' => $this->invitationId,
                'type'       => $this->templateType,
                'keterangan' => "Kirim WA {$label} type {$this->templateType} ke {$this->phone} ({$this->customerNama}). Status: gagal. Pesan: {$this->message}\nResponse: Error: " . $e->getMessage(),
                'create_at'  => now(),
                'status'     => '0',
            ]);

            Log::channel('followup')->error("Exception saat kirim pesan", [
                'customer_id' => $this->customerId,
                'customer_nama' => $this->customerNama,
                'customer_wa' => $this->phone,
                'template_id' => $this->templateId,
                'template_type' => $this->templateType,
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }
}
