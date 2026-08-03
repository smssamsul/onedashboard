<?php

namespace App\Console\Commands;

use App\Models\OrderCustomer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Satukan beberapa nilai utm_source lama ke `lpwa`.
 *
 * Nilai-nilai ini sebenarnya menggambarkan CARA order dicatat, bukan dari mana
 * pengunjungnya datang — dan sumber sebenarnya adalah landing page WhatsApp.
 * Selama labelnya berbeda-beda, laporan iklan sulit dibaca karena satu jalur
 * yang sama muncul sebagai beberapa sumber.
 *
 * Aman dijalankan berulang: baris yang sudah `lpwa` tidak akan tersentuh lagi.
 * Jejak asal-usul tetap ada di kolom `sumber` (mis. `sales_quick_order`), jadi
 * perubahan ini tidak menghapus informasi, hanya menyeragamkan label.
 */
class NormalisasiUtmSource extends Command
{
    protected $signature = 'utm:normalisasi-sumber
                            {--eksekusi : Terapkan perubahan. Tanpa opsi ini hanya menampilkan pratinjau}
                            {--backup-dir=storage/app/backup-utm : Folder tujuan file CSV cadangan}';

    protected $description = 'Ubah utm_source order_cepat/meta/leadig menjadi lpwa, dengan cadangan CSV lebih dulu.';

    /** utm_source lama yang disatukan ke TUJUAN. */
    private const SUMBER_LAMA = ['order_cepat', 'meta', 'leadig'];

    private const TUJUAN = 'lpwa';

    public function handle(): int
    {
        $eksekusi = (bool) $this->option('eksekusi');

        $this->info('=== Normalisasi utm_source ke "' . self::TUJUAN . '" ===');
        $this->line('Nilai yang diubah: ' . implode(', ', self::SUMBER_LAMA));

        if (!$eksekusi) {
            $this->warn('Mode pratinjau — tidak ada data yang disimpan. Tambahkan --eksekusi untuk menerapkan.');
        }

        $baris = OrderCustomer::whereIn('utm_source', self::SUMBER_LAMA)
            ->orderBy('id')
            ->get(['id', 'utm_source', 'utm_campaign', 'sumber', 'produk', 'create_at']);

        if ($baris->isEmpty()) {
            $this->info('Tidak ada baris yang perlu diubah.');
            return self::SUCCESS;
        }

        $this->newLine();
        $this->line('Rincian baris terdampak:');
        foreach ($baris->groupBy('utm_source') as $sumber => $rows) {
            $this->line(sprintf('  %-12s : %d baris', $sumber, $rows->count()));
        }
        $this->line(sprintf('  %-12s : %d baris', 'TOTAL', $baris->count()));

        if (!$eksekusi) {
            $this->newLine();
            $this->line('Jalankan ulang dengan --eksekusi untuk menerapkan.');
            return self::SUCCESS;
        }

        // Cadangan dibuat SEBELUM update, dan kalau gagal prosesnya berhenti —
        // jangan pernah mengubah data massal tanpa jejak baris aslinya.
        $fileCadangan = $this->tulisCadangan($baris);
        if ($fileCadangan === null) {
            $this->error('Gagal menulis file cadangan. Perubahan dibatalkan.');
            return self::FAILURE;
        }
        $this->info('Cadangan tersimpan: ' . $fileCadangan);

        $jumlah = DB::transaction(function () use ($baris) {
            return OrderCustomer::whereIn('id', $baris->pluck('id'))
                ->update(['utm_source' => self::TUJUAN]);
        });

        $this->info("Selesai. {$jumlah} baris diubah menjadi \"" . self::TUJUAN . '".');

        $sisa = OrderCustomer::whereIn('utm_source', self::SUMBER_LAMA)->count();
        $this->line("Sisa baris dengan nilai lama: {$sisa} (harusnya 0).");

        return self::SUCCESS;
    }

    /**
     * Tulis baris asli ke CSV supaya perubahan ini bisa dibatalkan manual.
     *
     * @return string|null  path file, atau null kalau gagal
     */
    private function tulisCadangan($baris): ?string
    {
        $dir = $this->option('backup-dir');
        if (!str_starts_with($dir, '/')) {
            $dir = base_path($dir);
        }

        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            return null;
        }

        $path = rtrim($dir, '/') . '/utm-source-' . now()->format('Ymd-His') . '.csv';
        $fh = @fopen($path, 'w');
        if ($fh === false) {
            return null;
        }

        fputcsv($fh, ['id', 'utm_source_lama', 'utm_campaign', 'sumber', 'produk', 'create_at']);
        foreach ($baris as $b) {
            fputcsv($fh, [
                $b->id,
                $b->utm_source,
                $b->utm_campaign,
                $b->sumber,
                $b->produk,
                $b->create_at,
            ]);
        }
        fclose($fh);

        return $path;
    }
}
