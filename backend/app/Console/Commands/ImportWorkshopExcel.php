<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Models\ProdukBundling;
use App\Services\SalesRoundRobinService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Import data pendaftaran Workshop yang selama ini dicatat manual oleh sales
 * di Excel (nama, WA, tier Platinum/Gold/Silver/Reseat, harga, sumber lead,
 * tanggal batch) jadi Customer + OrderCustomer beneran di sistem - supaya
 * laporan omzet Workshop bisa dihitung dari data order, bukan Excel lagi.
 *
 * Format Excel yang diharapkan (TANPA header, kolom berurutan):
 * No | WA | Nama | Sapaan | Panggilan | Tier | Harga | Sumber(lokasi) | Tanggal batch
 *
 * - Tier "RESEAT" dipetakan ke produk id=16 (TP - Reseat Workshop Ternak
 *   Properti), tier lain (PLATINUM/GOLD/SILVER) ke produk id=1 (Workshop
 *   Ternak Properti) dengan bundling sesuai nama tier (dibuat otomatis kalau
 *   belum ada).
 * - Kolom "sumber/lokasi" (mis. TDW, CRM, Jakarta, ZOOM) disimpan di kolom
 *   `sumber` - ini SUMBER LEAD peserta (dari mana dia datang), bukan lokasi
 *   venue. Kalau kosong, fallback ke "import_excel_workshop".
 * - Baris tanpa tier & harga tidak valid (mis. cuma catatan) DILEWATI, bukan
 *   dipaksa masuk - dilaporkan terpisah supaya dicek manual.
 * - Aman dijalankan berulang: baris yang sudah pernah diimport (customer +
 *   produk + tanggal + harga sama) dilewati, tidak dobel.
 */
class ImportWorkshopExcel extends Command
{
    protected $signature = 'workshop:import-excel
                            {file : Path file .xlsx di server}
                            {--eksekusi : Terapkan perubahan. Tanpa opsi ini hanya pratinjau}
                            {--backup-dir=storage/app/backup-workshop-import : Folder log hasil import}';

    protected $description = 'Import pendaftaran Workshop dari Excel manual sales jadi Customer + OrderCustomer';

    private const PRODUK_UTAMA_ID = 1;    // Workshop Ternak Properti
    private const PRODUK_RESEAT_ID = 16;  // TP - Reseat Workshop Ternak Properti
    private const SUMBER_ORDER = 'import_excel_workshop';

    /** Tanggal batch yang teksnya bukan format tanggal baku - map manual ke tanggal representatif (asumsi tahun 2026). */
    private const PETA_TANGGAL = [
        '7 & 8 FEB' => '2026-02-07',
        '3 MEI' => '2026-05-03',
        '03 MEI' => '2026-05-03',
        '4 JULI' => '2026-07-04',
        '04 JULI' => '2026-07-04',
    ];

    public function handle(): int
    {
        $path = $this->argument('file');
        if (!file_exists($path)) {
            $this->error("File tidak ditemukan: {$path}");
            return self::FAILURE;
        }

        $eksekusi = (bool) $this->option('eksekusi');

        $this->info('Membaca file Excel...');
        $baris = $this->bacaExcel($path);

        $valid = [];
        $dilewati = [];
        foreach ($baris as $i => $b) {
            $hasil = $this->validasiBaris($b, $i + 1);
            if ($hasil['valid']) {
                $valid[] = $hasil['data'];
            } else {
                $dilewati[] = $hasil;
            }
        }

        $this->info('=== Ringkasan baca Excel ===');
        $this->line('Total baris: ' . count($baris));
        $this->line('Valid untuk diimport: ' . count($valid));
        $this->line('Dilewati (data tidak lengkap/tidak jelas): ' . count($dilewati));
        if (count($dilewati) > 0) {
            $this->newLine();
            $this->warn('Baris yang dilewati:');
            foreach ($dilewati as $d) {
                $this->line("  Baris #{$d['baris']}: {$d['alasan']} - " . json_encode($d['mentah'], JSON_UNESCAPED_UNICODE));
            }
        }

        // Pratinjau pencocokan customer + deteksi duplikat tanpa menulis apapun.
        $rencana = [];
        $rekapTier = [];
        $customerBaru = 0;
        $customerLama = 0;
        $sudahPernahDiimport = 0;

        foreach ($valid as $row) {
            $wa = $row['wa'];
            $customer = Customer::where('wa', $wa)->first();
            $statusCustomer = $customer ? 'lama' : 'baru';
            $statusCustomer === 'baru' ? $customerBaru++ : $customerLama++;

            $produkId = $row['tier'] === 'RESEAT' ? self::PRODUK_RESEAT_ID : self::PRODUK_UTAMA_ID;

            $sudahAda = false;
            if ($customer) {
                $sudahAda = OrderCustomer::where('customer', $customer->id)
                    ->where('produk', $produkId)
                    ->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) = ?", [$row['tanggal']->toDateString()])
                    ->where('total_harga', (string) $row['harga'])
                    ->where('status', '!=', 'N')
                    ->exists();
            }
            if ($sudahAda) {
                $sudahPernahDiimport++;
            }

            $rekapTier[$row['tier']] = ($rekapTier[$row['tier']] ?? 0) + 1;
            $rencana[] = $row + [
                'customer_status' => $statusCustomer,
                'sudah_pernah_diimport' => $sudahAda,
            ];
        }

        $this->newLine();
        $this->info('=== Rencana import ===');
        $this->line('Customer baru akan dibuat: ' . $customerBaru);
        $this->line('Customer sudah ada (dipakai yang ada): ' . $customerLama);
        $this->line('Sudah pernah diimport sebelumnya (akan dilewati): ' . $sudahPernahDiimport);
        $this->line('Order baru yang akan dibuat: ' . (count($valid) - $sudahPernahDiimport));
        $this->newLine();
        $this->line('Rekap per tier:');
        foreach ($rekapTier as $tier => $jumlah) {
            $totalHarga = array_sum(array_map(fn ($r) => $r['tier'] === $tier ? $r['harga'] : 0, $rencana));
            $this->line(sprintf('  %-10s : %d peserta, total Rp %s', $tier, $jumlah, number_format($totalHarga, 0, ',', '.')));
        }

        if (!$eksekusi) {
            $this->newLine();
            $this->warn('Mode pratinjau - tidak ada data yang ditulis. Tambahkan --eksekusi untuk menerapkan.');
            return self::SUCCESS;
        }

        // Pastikan bundling platinum & silver ada (gold sudah ada di produk id=1).
        $this->pastikanBundlingAda();

        $dir = $this->option('backup-dir');
        if (!str_starts_with($dir, '/')) {
            $dir = base_path($dir);
        }
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $logPath = rtrim($dir, '/') . '/import-workshop-' . now()->format('Ymd-His') . '.csv';
        $logFh = fopen($logPath, 'w');
        fputcsv($logFh, ['order_id', 'kode_order', 'customer_id', 'nama', 'wa', 'tier', 'produk_id', 'harga', 'tanggal', 'customer_status']);

        $dibuat = 0;
        $dilewatiSaatEksekusi = 0;
        $bar = $this->output->createProgressBar(count($valid));
        $bar->start();

        foreach ($valid as $row) {
            $hasil = DB::transaction(function () use ($row) {
                return $this->importSatuBaris($row);
            });

            if ($hasil === null) {
                $dilewatiSaatEksekusi++;
            } else {
                fputcsv($logFh, [
                    $hasil['order']->id,
                    $hasil['order']->kode_order,
                    $hasil['customer']->id,
                    $row['nama'],
                    $row['wa'],
                    $row['tier'],
                    $hasil['order']->produk,
                    $row['harga'],
                    $row['tanggal']->toDateString(),
                    $hasil['customer_status'],
                ]);
                $dibuat++;
            }
            $bar->advance();
        }

        $bar->finish();
        fclose($logFh);
        $this->newLine(2);

        $this->info("Selesai. Order dibuat: {$dibuat}. Dilewati (sudah pernah diimport): {$dilewatiSaatEksekusi}.");
        $this->info("Log hasil import: {$logPath}");

        return self::SUCCESS;
    }

    private function bacaExcel(string $path): array
    {
        $spreadsheet = IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = [];

        foreach ($sheet->getRowIterator() as $row) {
            $cells = [];
            foreach ($row->getCellIterator() as $cell) {
                $cells[] = $cell;
            }
            // Kolom: 0=no,1=wa,2=nama,3=sapaan,4=panggilan,5=tier,6=harga,7=lokasi,8=tanggal
            if (count($cells) < 6 || $cells[0]->getValue() === null) {
                continue;
            }
            $rows[] = [
                'no' => $cells[0]->getValue(),
                'wa' => $cells[1]->getValue(),
                'nama' => $cells[2]->getValue(),
                'tier' => $cells[5]->getValue(),
                'harga' => $cells[6]->getValue(),
                'lokasi' => $cells[7]->getValue() ?? null,
                'tanggal_raw' => $cells[8]->getValue() ?? null,
                'tanggal_terformat' => \PhpOffice\PhpSpreadsheet\Shared\Date::isDateTime($cells[8])
                    ? \PhpOffice\PhpSpreadsheet\Shared\Date::excelToDateTimeObject($cells[8]->getValue())
                    : null,
            ];
        }

        return $rows;
    }

    private function validasiBaris(array $b, int $nomorBaris): array
    {
        $wa = preg_replace('/\D/', '', (string) $b['wa']);
        if (substr($wa, 0, 1) === '0') {
            $wa = '62' . substr($wa, 1);
        }

        $nama = trim((string) $b['nama']);
        $tier = strtoupper(trim((string) $b['tier']));
        $harga = is_numeric($b['harga']) ? (float) $b['harga'] : null;
        $lokasi = $b['lokasi'] !== null ? trim((string) $b['lokasi']) : null;

        if ($wa === '' || $nama === '') {
            return ['valid' => false, 'baris' => $nomorBaris, 'alasan' => 'WA/nama kosong', 'mentah' => $b];
        }
        if ($tier === '' || $harga === null || $harga <= 0) {
            return ['valid' => false, 'baris' => $nomorBaris, 'alasan' => 'Tier atau harga tidak valid', 'mentah' => $b];
        }
        if (!in_array($tier, ['PLATINUM', 'GOLD', 'SILVER', 'RESEAT'], true)) {
            return ['valid' => false, 'baris' => $nomorBaris, 'alasan' => "Tier tidak dikenal: {$tier}", 'mentah' => $b];
        }

        $tanggal = $this->parseTanggal($b);
        if ($tanggal === null) {
            return ['valid' => false, 'baris' => $nomorBaris, 'alasan' => 'Tanggal batch tidak bisa diparse', 'mentah' => $b];
        }

        return [
            'valid' => true,
            'data' => [
                'wa' => $wa,
                'nama' => $nama,
                'tier' => $tier,
                'harga' => $harga,
                'lokasi' => $lokasi,
                'tanggal' => $tanggal,
            ],
        ];
    }

    private function parseTanggal(array $b): ?Carbon
    {
        if ($b['tanggal_terformat'] !== null) {
            return Carbon::instance($b['tanggal_terformat'])->startOfDay();
        }

        $raw = trim((string) ($b['tanggal_raw'] ?? ''));
        if (isset(self::PETA_TANGGAL[$raw])) {
            return Carbon::parse(self::PETA_TANGGAL[$raw]);
        }

        try {
            return Carbon::parse($raw);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function pastikanBundlingAda(): void
    {
        $tierHargaDefault = ['platinum' => 12898000, 'silver' => 4898000];
        foreach ($tierHargaDefault as $nama => $harga) {
            $ada = ProdukBundling::where('produk', self::PRODUK_UTAMA_ID)
                ->whereRaw('LOWER(nama) = ?', [$nama])
                ->exists();
            if (!$ada) {
                ProdukBundling::create([
                    'produk' => self::PRODUK_UTAMA_ID,
                    'nama' => $nama,
                    'harga' => $harga,
                    'status' => 'A',
                ]);
                $this->line("Bundling \"{$nama}\" dibuat untuk produk id " . self::PRODUK_UTAMA_ID);
            }
        }
    }

    private function importSatuBaris(array $row): ?array
    {
        $produkId = $row['tier'] === 'RESEAT' ? self::PRODUK_RESEAT_ID : self::PRODUK_UTAMA_ID;

        $customer = Customer::where('wa', $row['wa'])->lockForUpdate()->first();
        $customerStatus = 'lama';
        if (!$customer) {
            $customerStatus = 'baru';
            $salesId = app(SalesRoundRobinService::class)->getNextSalesId($produkId);
            $customer = Customer::create([
                'nama' => $row['nama'],
                'wa' => $row['wa'],
                'sales_id' => $salesId,
                'status' => '1',
                'keanggotaan' => 'basic',
                'create_at' => $row['tanggal'],
            ]);
            $customer->update(['memberID' => $this->buatMemberID($customer)]);
        }

        $sudahAda = OrderCustomer::where('customer', $customer->id)
            ->where('produk', $produkId)
            ->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) = ?", [$row['tanggal']->toDateString()])
            ->where('total_harga', (string) $row['harga'])
            ->where('status', '!=', 'N')
            ->exists();
        if ($sudahAda) {
            return null;
        }

        $bundlingId = null;
        if ($row['tier'] !== 'RESEAT') {
            $bundlingId = ProdukBundling::where('produk', self::PRODUK_UTAMA_ID)
                ->whereRaw('LOWER(nama) = ?', [strtolower($row['tier'])])
                ->value('id');
        }

        $kodeOrder = $this->buatKodeOrder($row['tanggal']);

        $order = OrderCustomer::create([
            'customer' => $customer->id,
            'sales_id' => $customer->sales_id,
            'produk' => $produkId,
            'bundling' => $bundlingId,
            'kode_order' => $kodeOrder,
            'tanggal' => $row['tanggal'],
            'harga' => (string) $row['harga'],
            'total_harga' => (string) $row['harga'],
            'sumber' => $row['lokasi'] ?: self::SUMBER_ORDER,
            'status_order' => '4',
            'status_pembayaran' => '2',
            'status' => '1',
            'create_at' => $row['tanggal'],
        ]);

        return ['order' => $order, 'customer' => $customer, 'customer_status' => $customerStatus];
    }

    private function buatKodeOrder(Carbon $tanggal): string
    {
        $prefix = 'ORD' . $tanggal->format('dmy');
        $lastKode = OrderCustomer::query()
            ->whereNotNull('kode_order')
            ->where('kode_order', 'like', $prefix . '%')
            ->lockForUpdate()
            ->orderBy('kode_order', 'desc')
            ->value('kode_order');

        $lastSeq = 0;
        if (is_string($lastKode) && strlen($lastKode) >= (strlen($prefix) + 4)) {
            $tail = substr($lastKode, -4);
            if (ctype_digit($tail)) {
                $lastSeq = (int) $tail;
            }
        }

        return $prefix . str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);
    }

    private function buatMemberID(Customer $customer): string
    {
        $datePart = Carbon::parse($customer->create_at)->format('Ymd');
        for ($i = 0; $i < 100; $i++) {
            $kandidat = $datePart . str_pad((string) rand(1, 99999), 5, '0', STR_PAD_LEFT);
            if (!Customer::where('memberID', $kandidat)->exists()) {
                return $kandidat;
            }
        }
        return $datePart . str_pad((string) rand(1, 99999), 5, '0', STR_PAD_LEFT);
    }
}
