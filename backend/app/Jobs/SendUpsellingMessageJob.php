<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use App\Models\LogsFollup;

class SendUpsellingMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 60;

    public function __construct(
        public int $templateId,
        public string $message,
        public string $phone,
        public string $customerNama,
        public int $customerId,
        public int $kehadiranId,
        public ?int $orderId,
        public ?int $invitationId,
        public string $namaJadwal,
        public string $tanggalHadirFormatted,
        public ?string $woowaKey,
    ) {
        $this->onQueue('followup');
    }

    public function handle(): void
    {
        // Jaga-jaga terakhir sebelum kirim - lihat penjelasan yang sama di
        // SendFollowupMessageJob::handle(). Delay job ini bisa berjarak cukup lama
        // dari saat cron jalan, jadi dicek ulang di sini supaya tidak terkirim ganda
        // kalau cron sempat jalan lagi sebelum baris LogsFollup pertama tercatat.
        $sudahDiproses = LogsFollup::where('follup', $this->templateId)
            ->where('customer', $this->customerId)
            ->where('kehadiran', $this->kehadiranId)
            ->where('type', '8')
            ->exists();

        if ($sudahDiproses) {
            return;
        }

        try {
            $response = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $this->phone,
                    'key'      => $this->woowaKey,
                    'message'  => $this->message,
                ]);

            $statusText = $response->successful() ? 'sukses' : 'gagal';
            $keterangan = "Kirim WA upselling type 8 ke {$this->phone} ({$this->customerNama}), hadir di jadwal \"{$this->namaJadwal}\" ({$this->tanggalHadirFormatted}). Status: {$statusText}. Pesan: {$this->message}";

            LogsFollup::create([
                'follup'     => $this->templateId,
                'customer'   => $this->customerId,
                'order'      => $this->orderId,
                'invitation' => $this->invitationId,
                'kehadiran'  => $this->kehadiranId,
                'type'       => '8',
                'keterangan' => $keterangan,
                'create_at'  => now(),
                'status'     => $response->successful() ? '1' : '0',
            ]);
        } catch (\Exception $e) {
            LogsFollup::create([
                'follup'     => $this->templateId,
                'customer'   => $this->customerId,
                'order'      => $this->orderId,
                'invitation' => $this->invitationId,
                'kehadiran'  => $this->kehadiranId,
                'type'       => '8',
                'keterangan' => "Gagal kirim upselling. Error: " . $e->getMessage(),
                'create_at'  => now(),
                'status'     => '0',
            ]);

            throw $e;
        }
    }
}
