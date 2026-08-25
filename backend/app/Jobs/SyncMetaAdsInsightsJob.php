<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Jalankan `meta-ads:sync-insights` di background (queue), bukan langsung di
 * request HTTP. Meta Graph API bisa lambat/timeout, dan sync 1 akun saja bisa
 * makan waktu lebih dari max_execution_time PHP (30s) - kalau dijalankan
 * synchronous di controller, request-nya keburu diputus proxy sebelum sempat
 * selesai/logging apapun. Status progress disimpan di cache, dibaca lewat
 * endpoint /meta-ads/performance/sync/status untuk di-polling dari frontend.
 */
class SyncMetaAdsInsightsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public const CACHE_KEY = 'meta-ads-sync-status';

    /** Tidak perlu retry otomatis - command di dalam sudah menangani gagal per-akun sendiri. */
    public int $tries = 1;

    /**
     * Meta API bisa lambat (timeout 15s x retry x beberapa endpoint per akun),
     * jadi kasih ruang jauh di atas default worker (60s). Nilainya sengaja di
     * bawah `retry_after` koneksi redis (lihat config/queue.php) supaya job
     * ini yang menyerah lebih dulu, bukan di-redeliver dobel oleh queue.
     */
    public int $timeout = 280;

    public function __construct(protected int $days = 30) {}

    public function handle(): void
    {
        Cache::put(self::CACHE_KEY, [
            'status' => 'running',
            'message' => 'Sedang menarik data dari Meta...',
            'output' => null,
            'started_at' => now()->toIso8601String(),
            'finished_at' => null,
        ], now()->addHour());

        try {
            Artisan::call('meta-ads:sync-insights', ['--days' => $this->days]);
            $output = trim(Artisan::output());

            $gagal = str_contains($output, 'Gagal sync') || str_contains($output, 'Error tak terduga');

            Cache::put(self::CACHE_KEY, [
                'status' => $gagal ? 'failed' : 'success',
                'message' => $gagal
                    ? 'Sebagian/seluruh akun gagal di-sync. Cek detail error.'
                    : 'Sync selesai. Data performa sudah diperbarui.',
                'output' => $output,
                'started_at' => Cache::get(self::CACHE_KEY)['started_at'] ?? now()->toIso8601String(),
                'finished_at' => now()->toIso8601String(),
            ], now()->addHour());
        } catch (\Throwable $e) {
            Log::error('SyncMetaAdsInsightsJob: gagal', ['error' => $e->getMessage()]);

            Cache::put(self::CACHE_KEY, [
                'status' => 'failed',
                'message' => 'Sync gagal: ' . $e->getMessage(),
                'output' => null,
                'started_at' => Cache::get(self::CACHE_KEY)['started_at'] ?? now()->toIso8601String(),
                'finished_at' => now()->toIso8601String(),
            ], now()->addHour());
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('SyncMetaAdsInsightsJob: job gagal total (timeout/exception tak tertangani)', [
            'error' => $exception->getMessage(),
        ]);

        Cache::put(self::CACHE_KEY, [
            'status' => 'failed',
            'message' => 'Sync gagal: ' . $exception->getMessage(),
            'output' => null,
            'started_at' => Cache::get(self::CACHE_KEY)['started_at'] ?? now()->toIso8601String(),
            'finished_at' => now()->toIso8601String(),
        ], now()->addHour());
    }
}
