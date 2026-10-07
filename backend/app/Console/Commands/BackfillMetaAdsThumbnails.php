<?php

namespace App\Console\Commands;

use App\Models\MetaAd;
use App\Models\MetaAdsAccount;
use App\Services\MetaAdsService;
use Illuminate\Console\Command;

/**
 * Migrasi satu-kali: iklan lama yang creative_payload-nya masih nyimpan URL
 * thumbnail Meta mentah (bertanda tangan, kedaluwarsa lewat parameter "oe")
 * diunduh ulang dan disimpan ke disk lokal - sama seperti yang sekarang
 * otomatis dilakukan SyncMetaAdsInsights::syncAds() untuk creative baru.
 *
 * Baris yang thumbnail_url-nya SUDAH berupa path lokal (sudah pernah
 * dibackfill / baru disync) dilewati, jadi command ini aman dijalankan
 * berulang kali.
 */
class BackfillMetaAdsThumbnails extends Command
{
    protected $signature = 'meta-ads:backfill-thumbnails {--limit=}';

    protected $description = 'Unduh ulang & simpan lokal thumbnail iklan Meta yang masih pakai URL Meta mentah (sudah/akan kedaluwarsa)';

    public function handle(): int
    {
        $query = MetaAd::whereNotNull('creative_payload')
            ->whereRaw("creative_payload->>'thumbnail_url' LIKE 'http%'");

        if ($limit = $this->option('limit')) {
            $query->limit((int) $limit);
        }

        $ads = $query->get(['id', 'ad_id', 'creative_payload']);
        $total = $ads->count();

        if ($total === 0) {
            $this->info('Tidak ada creative_payload dengan URL Meta mentah - tidak ada yang perlu dibackfill.');
            return self::SUCCESS;
        }

        $this->info("Ditemukan {$total} iklan dengan thumbnail URL Meta mentah.");

        // Backup sebelum ditimpa - catatan "ad_id => thumbnail_url lama", bisa
        // dipakai untuk audit kalau ada yang perlu ditelusuri lagi nanti.
        $backupPath = storage_path('app/backup-thumbnail-url-lama-' . now()->format('Ymd-His') . '.json');
        file_put_contents($backupPath, $ads->mapWithKeys(fn ($a) => [
            $a->ad_id => $a->creative_payload['thumbnail_url'] ?? null,
        ])->toJson(JSON_PRETTY_PRINT));
        $this->info("Backup URL lama disimpan ke: {$backupPath}");

        $account = MetaAdsAccount::where('is_active', true)->orderBy('id')->first();
        if (!$account) {
            $this->error('Belum ada akun Meta Ads yang aktif/terhubung.');
            return self::FAILURE;
        }
        $service = new MetaAdsService($account);

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $berhasil = 0;
        $gagal = 0;

        foreach ($ads as $ad) {
            $urlLama = $ad->creative_payload['thumbnail_url'] ?? null;
            $pathLokal = $urlLama ? $service->simpanThumbnailLokal($ad->ad_id, $urlLama) : null;

            if ($pathLokal) {
                $payload = $ad->creative_payload;
                $payload['thumbnail_url'] = $pathLokal;
                $ad->update(['creative_payload' => $payload]);
                $berhasil++;
            } else {
                $gagal++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Selesai. Berhasil: {$berhasil}. Gagal (URL sudah benar-benar mati di Meta): {$gagal}.");

        return self::SUCCESS;
    }
}
