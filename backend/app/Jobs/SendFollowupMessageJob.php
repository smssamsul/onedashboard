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
        public int $templateId,
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

        // Jaga-jaga terakhir sebelum benar-benar kirim: kalau kombinasi template+customer+
        // order/invitation ini sudah pernah tercatat (baik sukses maupun gagal), jangan kirim
        // lagi. Job ini dijadwalkan dengan delay yang bisa berjarak puluhan menit dari saat
        // cron jalan - kalau cron berikutnya (per jam) sempat jalan lagi SEBELUM delay ini
        // habis, order yang sama bisa ke-dispatch dua kali sebelum baris LogsFollup yang
        // pertama sempat tercatat. Cek ulang di sini (bukan cuma di cron sebelum dispatch)
        // supaya benar-benar dijamin cuma terkirim sekali, apa pun penyebab dispatch gandanya.
        $sudahDiproses = LogsFollup::where('follup', $this->templateId)
            ->where('customer', $this->customerId)
            ->where('type', $this->templateType)
            ->when($this->orderId, fn ($q) => $q->where('order', $this->orderId))
            ->when($this->invitationId, fn ($q) => $q->where('invitation', $this->invitationId))
            ->exists();

        if ($sudahDiproses) {
            try {
                Log::channel('followup')->info("Dilewati - sudah pernah diproses (cegah kirim ganda)", [
                    'customer_id' => $this->customerId,
                    'customer_nama' => $this->customerNama,
                    'template_id' => $this->templateId,
                    'order_id' => $this->orderId,
                    'invitation_id' => $this->invitationId,
                ]);
            } catch (\Throwable $logError) {
                // Sengaja ditelan - logging tidak boleh mengubah job "skip" ini jadi "gagal".
            }
            return;
        }

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

            // Pesan WA sudah terkirim (atau sudah dicatat gagal) di titik ini - jangan
            // sampai kegagalan LOGGING (mis. file log tidak writable) ikut membuat job
            // ini dianggap gagal oleh queue dan di-retry, karena retry berarti kirim
            // ulang pesan WA yang SAMA ke customer yang SAMA (pernah kejadian nyata:
            // WA sudah sukses terkirim, tapi Log::channel() gagal nulis file lalu
            // exception itu membuat job retry dan re-kirim WA-nya 2-3x). Logging di
            // sini murni informational, jadi dibungkus try/catch sendiri.
            try {
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
            } catch (\Throwable $logError) {
                // Sengaja ditelan - status pengiriman yang sebenarnya sudah aman
                // tersimpan di LogsFollup di atas, terlepas dari file log ini.
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
