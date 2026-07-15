<?php

namespace App\Jobs;

use App\Services\GoogleContactService;
use App\Models\Log as ActivityLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncContactToGoogleJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Jumlah percobaan jika job gagal.
     */
    public int $tries = 3;

    /**
     * Delay antar retry (dalam detik).
     */
    public int $backoff = 10;

    public function __construct(
        protected string $customerName,
        protected string $phoneNumber,
        protected ?int $customerId = null,
        protected ?string $userId = null
    ) {}

    /**
     * Proses job: cek duplikat lalu simpan ke Google Contacts.
     */
    public function handle(GoogleContactService $googleContact): void
    {
        // Validasi: skip jika nomor kosong
        if (empty(trim($this->phoneNumber))) {
            Log::warning('SyncContactToGoogleJob: Phone number kosong, job di-skip', [
                'name' => $this->customerName,
            ]);
            return;
        }

        Log::info('SyncContactToGoogleJob: Memulai sync', [
            'name'  => $this->customerName,
            'phone' => $this->phoneNumber,
        ]);

        // Cek apakah Google Contact terhubung
        if (!$googleContact->isReady()) {
            Log::info('SyncContactToGoogleJob: Google Contact belum terhubung / dikonfigurasi. Sync di-skip secara damai.', [
                'name' => $this->customerName,
                'phone' => $this->phoneNumber,
            ]);
            return;
        }

        // Cek apakah sudah ada di Google Contacts
        $alreadyExists = $googleContact->findContactByPhone($this->phoneNumber);

        if ($alreadyExists) {
            Log::info('SyncContactToGoogleJob: Kontak sudah ada, di-skip', [
                'phone' => $this->phoneNumber,
            ]);
            return;
        }

        // Simpan kontak baru
        $success = $googleContact->createContact($this->customerName, $this->phoneNumber);

        if ($success) {
            Log::info('SyncContactToGoogleJob: Kontak berhasil disimpan ke Google Contacts', [
                'name'  => $this->customerName,
                'phone' => $this->phoneNumber,
            ]);

            ActivityLog::create([
                'user' => $this->userId ?? '1',
                'customer' => $this->customerId,
                'keterangan' => "Upload Google Contact berhasil untuk {$this->customerName} ({$this->phoneNumber})",
                'create_at' => now(),
                'update_at' => now(),
                'status' => '1'
            ]);
        } else {
            // Log error instead of throwing exception so the order doesn't fail
            Log::error("Gagal menyimpan kontak ke Google: name={$this->customerName}, phone={$this->phoneNumber}");
        }
    }

    /**
     * Log jika job gagal setelah semua retry habis.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('SyncContactToGoogleJob: Job gagal setelah semua retry', [
            'name'      => $this->customerName,
            'phone'     => $this->phoneNumber,
            'error'     => $exception->getMessage(),
        ]);
    }
}
