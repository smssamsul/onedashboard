<?php

namespace App\Console\Commands;

use App\Models\DetailPercakapan;
use App\Models\Percakapan;
use App\Services\LeadActivityClassifierService;
use App\Services\LeadPointScoringService;
use Illuminate\Console\Command;

/**
 * Dua tahap:
 * 1. Reklasifikasi pesan customer yang intent-nya masih taksonomi LAMA
 *    (hot/warm/neutral/negatif dari ClaudeChatSentimentService) atau
 *    kosong - dipanggil ulang lewat LeadActivityClassifierService (17
 *    kategori baru), paralel pakai Http::pool supaya tidak berjam-jam.
 * 2. Skor ulang (poin) semua Percakapan berdasarkan kategori yang sudah
 *    lengkap - lihat LeadPointScoringService.
 *
 * Percakapan berstatus "trash" (ditandai manual sebagai spam) dilewati di
 * tahap 2 (skor), tapi pesannya TETAP direklasifikasi di tahap 1 supaya
 * datanya konsisten kalau suatu saat status trash-nya dicabut manual.
 */
class RescoreLeadIntent extends Command
{
    protected $signature = 'leads:rescore-intent
                            {--eksekusi : Terapkan perubahan. Tanpa opsi ini hanya menampilkan pratinjau}
                            {--lewati-reklasifikasi : Jangan panggil AI ulang, langsung skor dari kategori yang sudah ada}
                            {--backup-dir=storage/app/backup-lead-score : Folder tujuan file CSV cadangan}';

    protected $description = 'Reklasifikasi pesan customer (kategori baru) & skor ulang (poin) semua Percakapan';

    private const TAKSONOMI_LAMA = ['hot', 'warm', 'neutral', 'negatif'];
    private const UKURAN_BATCH = 20;

    public function handle(): int
    {
        $eksekusi = (bool) $this->option('eksekusi');
        $lewatiReklasifikasi = (bool) $this->option('lewati-reklasifikasi');

        $pesanPerluReklasifikasiQuery = DetailPercakapan::where('sender_type', 'customer')
            ->where(function ($q) {
                $q->whereNull('intent')->orWhereIn('intent', self::TAKSONOMI_LAMA);
            });
        $jumlahPerluReklasifikasi = $lewatiReklasifikasi ? 0 : $pesanPerluReklasifikasiQuery->count();

        $percakapanList = Percakapan::whereRaw('LOWER(TRIM(COALESCE(status, \'\'))) != ?', ['trash'])
            ->get(['id', 'phone_number', 'name', 'status', 'lead_score']);

        $this->info('=== Reklasifikasi & skor ulang lead ===');
        $this->line("Pesan customer perlu diklasifikasi ulang (taksonomi baru): {$jumlahPerluReklasifikasi}");
        $this->line('Percakapan diskor ulang (skip status "trash"): ' . $percakapanList->count());

        if (!$eksekusi) {
            $this->newLine();
            $this->warn('Mode pratinjau - tidak ada AI yang dipanggil, tidak ada data yang disimpan.');
            $this->line('Tambahkan --eksekusi untuk menerapkan (akan memanggil AI untuk pesan yang belum punya kategori baru).');
            return self::SUCCESS;
        }

        // Cadangan status/lead_score lama SEBELUM diubah.
        $fileCadangan = $this->tulisCadangan($percakapanList);
        if ($fileCadangan === null) {
            $this->error('Gagal menulis file cadangan. Perubahan dibatalkan.');
            return self::FAILURE;
        }
        $this->info('Cadangan tersimpan: ' . $fileCadangan);

        if (!$lewatiReklasifikasi && $jumlahPerluReklasifikasi > 0) {
            $this->reklasifikasiPesan($jumlahPerluReklasifikasi);
        }

        $this->newLine();
        $this->info('Menghitung skor ulang...');
        $scorer = app(LeadPointScoringService::class);
        $hasil = [];
        $bar = $this->output->createProgressBar($percakapanList->count());
        $bar->start();
        foreach ($percakapanList as $p) {
            $r = $scorer->rescoreAndSave($p);
            if ($r !== null) {
                $hasil[$r['label']] = ($hasil[$r['label']] ?? 0) + 1;
            }
            $bar->advance();
        }
        $bar->finish();
        $this->newLine(2);

        $this->info('Selesai. Distribusi label baru:');
        foreach ($hasil as $label => $jumlah) {
            $this->line(sprintf('  %-12s : %d', $label, $jumlah));
        }

        return self::SUCCESS;
    }

    private function reklasifikasiPesan(int $total): void
    {
        $this->info("Reklasifikasi {$total} pesan (paralel, batch " . self::UKURAN_BATCH . ")...");
        $classifier = app(LeadActivityClassifierService::class);
        $bar = $this->output->createProgressBar($total);
        $bar->start();

        while (true) {
            $batch = DetailPercakapan::where('sender_type', 'customer')
                ->where(function ($q) {
                    $q->whereNull('intent')->orWhereIn('intent', self::TAKSONOMI_LAMA);
                })
                ->orderBy('id')
                ->limit(self::UKURAN_BATCH)
                ->get(['id', 'message_text']);

            if ($batch->isEmpty()) {
                break;
            }

            $pesanUntukKlasifikasi = $batch->pluck('message_text', 'id')->all();
            $kategoriHasil = $classifier->classifyMany($pesanUntukKlasifikasi);

            foreach ($batch as $pesan) {
                DetailPercakapan::where('id', $pesan->id)->update([
                    'intent' => $kategoriHasil[$pesan->id] ?? 'netral',
                ]);
            }

            $bar->advance($batch->count());
        }

        $bar->finish();
        $this->newLine(2);
    }

    private function tulisCadangan($percakapanList): ?string
    {
        $dir = $this->option('backup-dir');
        if (!str_starts_with($dir, '/')) {
            $dir = base_path($dir);
        }

        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return null;
        }

        $path = rtrim($dir, '/') . '/lead-score-' . now()->format('Ymd-His') . '.csv';
        $fh = @fopen($path, 'w');
        if ($fh === false) {
            return null;
        }

        fputcsv($fh, ['id', 'phone_number', 'name', 'status_lama', 'lead_score_lama']);
        foreach ($percakapanList as $p) {
            fputcsv($fh, [$p->id, $p->phone_number, $p->name, $p->status, $p->lead_score]);
        }
        fclose($fh);

        return $path;
    }
}
