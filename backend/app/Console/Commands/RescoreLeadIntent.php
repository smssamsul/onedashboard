<?php

namespace App\Console\Commands;

use App\Models\Percakapan;
use App\Services\LeadIntentScoringService;
use Illuminate\Console\Command;

/**
 * Skoring ulang semua Percakapan berdasarkan intent pesan customer yang
 * sudah tersimpan (lihat LeadIntentScoringService) - tidak memanggil AI
 * lagi, cuma menggabungkan intent yang sudah ada, jadi aman & murah
 * dijalankan ke seluruh data lama.
 *
 * Percakapan berstatus "trash" (ditandai manual sebagai spam) dilewati.
 */
class RescoreLeadIntent extends Command
{
    protected $signature = 'leads:rescore-intent
                            {--eksekusi : Terapkan perubahan. Tanpa opsi ini hanya menampilkan pratinjau}
                            {--backup-dir=storage/app/backup-lead-score : Folder tujuan file CSV cadangan}';

    protected $description = 'Skoring ulang status/lead_score semua Percakapan berdasarkan intent pesan customer';

    public function handle(): int
    {
        $eksekusi = (bool) $this->option('eksekusi');
        $scorer = app(LeadIntentScoringService::class);

        $percakapanList = Percakapan::whereRaw('LOWER(TRIM(COALESCE(status, \'\'))) != ?', ['trash'])
            ->get(['id', 'phone_number', 'name', 'status', 'lead_score']);

        $this->info('=== Skoring ulang intent lead (skip status "trash") ===');
        $this->line('Jumlah percakapan diproses: ' . $percakapanList->count());

        if ($percakapanList->isEmpty()) {
            $this->info('Tidak ada data.');
            return self::SUCCESS;
        }

        if (!$eksekusi) {
            // Pratinjau: hitung label baru tanpa simpan, tampilkan distribusi.
            $preview = [];
            foreach ($percakapanList as $p) {
                $label = $scorer->computeLabel($p->id);
                $preview[$label] = ($preview[$label] ?? 0) + 1;
            }
            $this->newLine();
            $this->line('Distribusi label baru (pratinjau):');
            foreach ($preview as $label => $jumlah) {
                $this->line(sprintf('  %-12s : %d', $label, $jumlah));
            }
            $this->newLine();
            $this->warn('Mode pratinjau - tidak ada data yang disimpan. Tambahkan --eksekusi untuk menerapkan.');
            return self::SUCCESS;
        }

        // Cadangan status/lead_score lama SEBELUM diubah.
        $fileCadangan = $this->tulisCadangan($percakapanList);
        if ($fileCadangan === null) {
            $this->error('Gagal menulis file cadangan. Perubahan dibatalkan.');
            return self::FAILURE;
        }
        $this->info('Cadangan tersimpan: ' . $fileCadangan);

        $hasil = [];
        $bar = $this->output->createProgressBar($percakapanList->count());
        $bar->start();
        foreach ($percakapanList as $p) {
            $label = $scorer->rescoreAndSave($p);
            if ($label !== null) {
                $hasil[$label] = ($hasil[$label] ?? 0) + 1;
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
