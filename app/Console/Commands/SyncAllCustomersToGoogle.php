<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Services\GoogleContactService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncAllCustomersToGoogle extends Command
{
    protected $signature = 'google:sync-contacts
                            {--dry-run : Jalankan tanpa benar-benar menyimpan ke Google}
                            {--limit=0 : Batasi jumlah customer yang diproses (0 = semua)}
                            {--skip=0  : Lewati N customer pertama (untuk resume)}';

    protected $description = 'Sync semua customer existing ke Google Contacts (skip jika sudah ada)';

    public function __construct(protected GoogleContactService $googleContact)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        if (!$this->googleContact->isReady()) {
            $this->error('❌ Google Contact belum terhubung atau konfigurasi OAuth (.env) tidak lengkap.');
            $this->warn('Silakan hubungkan akun Google di Dashboard Sales Setting terlebih dahulu.');
            return self::FAILURE;
        }

        $isDryRun = $this->option('dry-run');
        $limit    = (int) $this->option('limit');
        $skip     = (int) $this->option('skip');

        $this->info('');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('  Bulk Sync Customer → Google Contacts');
        $this->info($isDryRun ? '  Mode: DRY RUN (tidak ada perubahan nyata)' : '  Mode: LIVE');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('');

        // Query customer yang punya nomor WA
        $query = Customer::query()
            ->whereNotNull('wa')
            ->where('wa', '<>', '')
            ->where('status', '<>', 'N')
            ->orderBy('id')
            ->skip($skip);

        if ($limit > 0) {
            $query->limit($limit);
        }

        $customers = $query->get(['id', 'nama', 'wa']);
        $total     = $customers->count();

        if ($total === 0) {
            $this->warn('Tidak ada customer dengan nomor WA yang ditemukan.');
            return self::SUCCESS;
        }

        $this->info("Total customer yang akan diproses: {$total}");
        $this->info('');

        $bar     = $this->output->createProgressBar($total);
        $saved   = 0;
        $skipped = 0;
        $errors  = 0;

        $bar->start();

        foreach ($customers as $customer) {
            try {
                if ($isDryRun) {
                    // Dry run: hanya cek tanpa simpan
                    $exists = $this->googleContact->findContactByPhone($customer->wa);
                    if ($exists) {
                        $skipped++;
                    } else {
                        $saved++; // Akan disimpan jika bukan dry-run
                    }
                } else {
                    $exists = $this->googleContact->findContactByPhone($customer->wa);
                    if ($exists) {
                        $skipped++;
                    } else {
                        $success = $this->googleContact->createContact(
                            $customer->nama ?? '',
                            $customer->wa
                        );
                        if ($success) {
                            $saved++;
                        } else {
                            $errors++;
                        }
                        // Throttle: jangan spam API Google
                        usleep(200000); // 200ms delay
                    }
                }
            } catch (\Exception $e) {
                $errors++;
                Log::error('SyncAllCustomersToGoogle: Error untuk customer', [
                    'customer_id' => $customer->id,
                    'wa'          => $customer->wa,
                    'error'       => $e->getMessage(),
                ]);
            }

            $bar->advance();
        }

        $bar->finish();
        $this->info('');
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('  Hasil' . ($isDryRun ? ' (DRY RUN)' : ''));
        $this->info('═══════════════════════════════════════════════════════');
        $this->info("  ✅ Berhasil disimpan : {$saved}");
        $this->info("  ⏭️  Di-skip (sudah ada): {$skipped}");
        $this->error("  ❌ Error              : {$errors}");
        $this->info('═══════════════════════════════════════════════════════');

        if ($isDryRun) {
            $this->warn('');
            $this->warn('Ini adalah DRY RUN. Jalankan tanpa --dry-run untuk benar-benar menyimpan.');
            $this->warn('  php artisan google:sync-contacts');
        }

        return self::SUCCESS;
    }
}
