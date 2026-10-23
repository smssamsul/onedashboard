<?php

namespace App\Console\Commands;

use App\Models\LeadLpwa;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Import batch leads mentah dari Excel (dari tim ads) ke lead_lpwas.
 *
 * Format file: baris 1 header ("phone, name, kota"), lalu per baris:
 *   A=no WA, B=nama, C=kota, D=kode varian iklan (mis. "v2", "i3"), E=label
 *   sumber (mis. "Meta Ads"). Sumber digabung "{E} {D}" (mis. "Meta Ads v2").
 * Baris tanpa nomor WA di-skip. WA yang sudah ada di lead_lpwas (no_wa match)
 * di-skip, tidak ditimpa - supaya tidak menghapus histori chat yang sudah ada.
 */
class ImportLeadExcel extends Command
{
    protected $signature = 'import:lead-excel
        {--file= : Path ke file xlsx}
        {--sales= : user_id sales pemilik batch lead ini (wajib)}
        {--dry-run : Cuma tampilkan ringkasan, tidak menulis apapun ke database}';

    protected $description = 'Import batch leads mentah dari Excel (phone, name, kota, kode iklan) ke lead_lpwas, skip WA yang sudah ada';

    public function handle(): int
    {
        $file = $this->option('file');
        if (!$file || !file_exists($file)) {
            $this->error("File tidak ditemukan: {$file}");
            return self::FAILURE;
        }

        $salesUserId = (int) $this->option('sales');
        if (!$salesUserId) {
            $this->error('Option --sales wajib diisi (user_id sales pemilik lead).');
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');

        $this->info(($dryRun ? '[DRY-RUN] ' : '') . "Membaca file: {$file}");

        $spreadsheet = IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $parsed = [];
        $skippedNoWa = 0;
        $dupDalamFile = 0;
        $seenWa = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            $wa = $this->normWa($sheet->getCell("A{$row}")->getValue());
            $nama = trim((string) $sheet->getCell("B{$row}")->getValue());
            $kota = trim((string) $sheet->getCell("C{$row}")->getValue());
            $kode = trim((string) $sheet->getCell("D{$row}")->getValue());
            $label = trim((string) $sheet->getCell("E{$row}")->getValue());

            if (!$wa) {
                $skippedNoWa++;
                continue;
            }
            if (isset($seenWa[$wa])) {
                $dupDalamFile++;
                continue;
            }
            $seenWa[$wa] = true;

            $sumber = trim($label . ' ' . $kode) ?: null;

            $parsed[] = [
                'row' => $row,
                'wa' => $wa,
                'nama' => $nama ?: 'Lead Import',
                'lokasi' => $kota !== '' ? $this->titleCase($kota) : null,
                'sumber' => $sumber,
            ];
        }

        $existingWa = DB::table('lead_lpwas')
            ->whereIn('no_wa', array_column($parsed, 'wa'))
            ->pluck('no_wa')
            ->flip();

        $toImport = [];
        $sudahAda = 0;
        foreach ($parsed as $r) {
            if (isset($existingWa[$r['wa']])) {
                $sudahAda++;
                continue;
            }
            $toImport[] = $r;
        }

        $this->info("Total baris Excel (selain header): " . ($highestRow - 1));
        $this->info("Skip - tanpa nomor WA: {$skippedNoWa}");
        $this->info("Skip - duplikat dalam file: {$dupDalamFile}");
        $this->info("Skip - WA sudah ada di lead_lpwas: {$sudahAda}");
        $this->info("SIAP DIIMPORT (baru): " . count($toImport));

        if ($dryRun) {
            $this->newLine();
            $this->info('Contoh baris yang akan diimport:');
            foreach (array_slice($toImport, 0, 5) as $r) {
                $this->line("  row {$r['row']}: wa={$r['wa']} nama=\"{$r['nama']}\" lokasi=\"{$r['lokasi']}\" sumber=\"{$r['sumber']}\" sales_id={$salesUserId}");
            }
            $this->info('[DRY-RUN] Tidak ada yang ditulis ke database.');
            return self::SUCCESS;
        }

        $created = 0;
        foreach ($toImport as $r) {
            LeadLpwa::create([
                'nama' => $r['nama'],
                'no_wa' => $r['wa'],
                'lokasi' => $r['lokasi'],
                'sumber' => $r['sumber'],
                'sales_id' => $salesUserId,
            ]);
            $created++;
        }

        $this->info("Selesai. Lead baru dibuat: {$created}.");

        return self::SUCCESS;
    }

    private function normWa($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        $s = preg_replace('/\D/', '', (string) $v);
        if (!$s) {
            return null;
        }
        if (str_starts_with($s, '0')) {
            $s = '62' . substr($s, 1);
        } elseif (str_starts_with($s, '8')) {
            $s = '62' . $s;
        }
        return $s;
    }

    private function titleCase(string $s): string
    {
        return mb_convert_case(mb_strtolower($s), MB_CASE_TITLE, 'UTF-8');
    }
}
