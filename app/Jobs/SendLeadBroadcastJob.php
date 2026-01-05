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
                Log::warning('SendLeadBroadcastJob: Lead atau customer tidak memiliki WA', [
                    'lead_id' => $this->leadId,
                ]);
                return;
            }

            Log::info('Mengirim Lead Broadcast via Queue', [
                'lead_id' => $this->leadId,
                'phone' => $lead->customer_rel->wa,
                'customer_id' => $lead->customer_id,
            ]);

            $phoneNumber = preg_replace('/[^0-9]/', '', $lead->customer_rel->wa);
            if (substr($phoneNumber, 0, 1) === '0') {
                $phoneNumber = '62' . substr($phoneNumber, 1);
            }

            $response = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->timeout(30)
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $phoneNumber,
                    'key'      => $this->woowaKey,
                    'message'  => $this->message,
                ]);

            $responseData = $response->json();

            if ($response->successful()) {
                Log::info('Lead Broadcast berhasil dikirim via Queue', [
                    'lead_id' => $this->leadId,
                    'phone' => $phoneNumber,
                    'response' => $responseData
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
                Log::error('Gagal kirim Lead Broadcast via Queue', [
                    'lead_id' => $this->leadId,
                    'phone' => $phoneNumber,
                    'status' => $response->status(),
                    'response' => $responseData
                ]);
                
                throw new \Exception('Gagal mengirim Lead Broadcast: HTTP ' . $response->status());
            }

        } catch (\Exception $e) {
            Log::error('Error di SendLeadBroadcastJob', [
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
        Log::error('SendLeadBroadcastJob gagal setelah semua retry', [
            'lead_id' => $this->leadId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}

