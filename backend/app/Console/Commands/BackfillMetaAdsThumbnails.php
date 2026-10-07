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
 * PENTING: URL yang sudah tersimpan di DB kemungkinan BESAR sudah kedaluwarsa
 * (itu kan sebabnya command ini ada) - jadi command ini minta ULANG field
 * creative ke Meta (dapat URL thumbnail yang baru/fresh), baru diunduh dari
 * situ. Diproses per-batch (bukan satu panggilan besar) supaya kalau Meta
 * error di tengah jalan, batch yang sudah berhasil tidak ikut hilang.
 *
 * Baris yang thumbnail_url-nya SUDAH berupa path lokal (sudah pernah
 * dibackfill / baru disync) dilewati, jadi command ini aman dijalankan
 * berulang kali.
 */
class BackfillMetaAdsThumbnails extends Command
{
    protected $signature = 'meta-ads:backfill-thumbnails {--limit=} {--batch=50}';

    protected $description = 'Minta ulang creative ke Meta (URL fresh) lalu unduh & simpan lokal thumbnail iklan yang masih pakai URL Meta mentah';

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
        $batchSize = max(1, (int) $this->option('batch'));

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $berhasil = 0;
        $gagalFetchCreative = 0;
        $gagalUnduh = 0;

        foreach ($ads->chunk($batchSize) as $batch) {
            try {
                $creativeSegar = $service->getAdsCreatives($batch->pluck('ad_id')->all(), $batchSize);
            } catch (\Throwable $e) {
                $this->newLine();
                $this->warn('Batch gagal minta creative ke Meta (' . $batch->count() . ' iklan dilewati): ' . $e->getMessage());
                $gagalFetchCreative += $batch->count();
                $bar->advance($batch->count());
                continue;
            }

            foreach ($batch as $ad) {
                $urlSegar = $creativeSegar[$ad->ad_id]['thumbnail_url'] ?? null;
                $pathLokal = $urlSegar ? $service->simpanThumbnailLokal($ad->ad_id, $urlSegar) : null;

                if ($pathLokal) {
                    $payload = $ad->creative_payload;
                    $payload['thumbnail_url'] = $pathLokal;
                    $ad->update(['creative_payload' => $payload]);
                    $berhasil++;
                } elseif ($urlSegar === null) {
                    $gagalFetchCreative++;
                } else {
                    $gagalUnduh++;
                }

                $bar->advance();
            }
        }

        $bar->finish();
        $this->newLine(2);
        $this->info(
            "Selesai. Berhasil: {$berhasil}. " .
            "Meta tidak kasih creative lagi (ad lama/arsip): {$gagalFetchCreative}. " .
            "Creative ada tapi gagal unduh gambarnya: {$gagalUnduh}."
        );

        return self::SUCCESS;
    }
}
