<?php

namespace App\Console\Commands;

use App\Models\Percakapan;
use App\Services\LeadConversationAnalysisService;
use Illuminate\Console\Command;

/**
 * Refresh harian analisa naratif AI (ringkasan/potensi/keberatan/
 * rekomendasi) - HANYA untuk lead "aktif": punya pesan customer, belum
 * ditandai trash/low_quality, dan last_message_at masih dalam N hari
 * terakhir (default 30). Lead yang sudah lama tidak ada aktivitas TIDAK
 * dianalisa ulang tiap hari - buang-buang panggilan AI untuk sesuatu yang
 * tidak berubah.
 *
 * Dijadwalkan harian lewat Kernel.php (leads:daily-ai-analysis).
 */
class DailyLeadAnalysisRefresh extends Command
{
    protected $signature = 'leads:daily-ai-analysis {--hari=30 : Batas aktif dalam berapa hari terakhir}';

    protected $description = 'Refresh analisa naratif AI untuk lead aktif (skip trash/low_quality/tidak aktif)';

    private const UKURAN_BATCH = 10;

    public function handle(): int
    {
        $hari = (int) $this->option('hari');

        $percakapanAktif = Percakapan::whereNotIn('status', ['trash', 'low_quality'])
            ->where('last_message_at', '>=', now()->subDays($hari))
            ->get(['id', 'phone_number', 'name', 'lead_score']);

        $this->info("=== Refresh analisa AI harian (lead aktif, {$hari} hari terakhir) ===");
        $this->line('Jumlah lead: ' . $percakapanAktif->count());

        if ($percakapanAktif->isEmpty()) {
            $this->info('Tidak ada lead aktif.');
            return self::SUCCESS;
        }

        $service = app(LeadConversationAnalysisService::class);
        $totalBerhasil = 0;
        $bar = $this->output->createProgressBar($percakapanAktif->count());
        $bar->start();

        foreach ($percakapanAktif->chunk(self::UKURAN_BATCH) as $batch) {
            $totalBerhasil += $service->analyzeManyAndSave($batch);
            $bar->advance($batch->count());
        }

        $bar->finish();
        $this->newLine(2);
        $this->info("Selesai. Berhasil dianalisa: {$totalBerhasil}/{$percakapanAktif->count()}");

        return self::SUCCESS;
    }
}
