<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Lead;
use App\Models\AktivitasLead;
use App\Models\FollowUpLead;
use Carbon\Carbon;

class SendLeadBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $leadId,
        public string $message,
        public string $woowaKey,
        public ?int $userId = null
    ) {
        // Queue untuk broadcast
        $this->onQueue('broadcast');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $lead = null;
        $response = null;

        try {
            $lead = Lead::with('customer_rel')->find($this->leadId);

            if (!$lead || !$lead->customer_rel || !$lead->customer_rel->wa) {
                Log::channel('broadcast')->warning('SendLeadBroadcastJob: Lead atau customer tidak memiliki WA', [
                    'lead_id' => $this->leadId,
                ]);
                return;
            }

            Log::channel('broadcast')->info('Mengirim Lead Broadcast via Queue', [
                'lead_id' => $this->leadId,
                'phone' => $lead->customer_rel->wa,
                'customer_id' => $lead->customer_id,
            ]);

            $phoneNumber = preg_replace('/[^0-9]/', '', $lead->customer_rel->wa);
            if (substr($phoneNumber, 0, 1) === '0') {
                $phoneNumber = '62' . substr($phoneNumber, 1);
            }

            $waSender = app(\App\Services\WhatsAppSenderService::class);
            
            // Ambil salesId dari customer
            $salesId = $lead->customer_rel->sales_id ?? null;

            $response = $waSender->sendMessage($phoneNumber, $this->message, $salesId, $this->woowaKey);

            if ($response->successful()) {
                Log::channel('broadcast')->info('Lead Broadcast berhasil dikirim via Queue', [
                    'lead_id' => $this->leadId,
                    'phone' => $phoneNumber,
                    'response' => $response->json()
                ]);

                // Create aktivitas
                AktivitasLead::create([
                    'lead_id' => $lead->id,
                    'type' => 'whatsapp_out',
                    'note' => $this->message,
                    'user_id' => $this->userId,
                    'create_at' => now(),
                ]);

                // Create follow up record
                FollowUpLead::create([
                    'lead_id' => $lead->id,
                    'follow_up_date' => now()->format('Y-m-d H:i:s'),
                    'channel' => 'WhatsApp',
                    'note' => $this->message,
                    'status' => '1',
                    'create_by' => $this->userId,
                    'create_at' => now()->format('Y-m-d H:i:s'),
                ]);

                // Update status dan last_contact_at
                $lead->update([
                    'status' => 'CONTACTED',
                    'last_contact_at' => now()->format('Y-m-d H:i:s'),
                    'update_at' => now()->format('Y-m-d H:i:s'),
                ]);

            } else {
                Log::channel('broadcast')->error('Gagal kirim Lead Broadcast via Queue', [
                    'lead_id' => $this->leadId,
                    'phone' => $phoneNumber,
                    'status_or_response' => $response->status(),
                    'response_json' => $response->json()
                ]);
                
                throw new \Exception('Gagal mengirim Lead Broadcast. Status: ' . $response->status());
            }

        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Error di SendLeadBroadcastJob', [
                'lead_id' => $this->leadId,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::channel('broadcast')->error('SendLeadBroadcastJob gagal setelah semua retry', [
            'lead_id' => $this->leadId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}

