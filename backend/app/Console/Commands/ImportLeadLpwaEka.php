<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\LeadLpwa;
use App\Models\OrderCustomer;
use App\Models\Produk;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

/**
 * Import file lead manual sales Eka (kolom: phone, name, kota) ke lead_lpwas,
 * sekaligus buat order pending+unpaid per lead kalau kota-nya bisa dipetakan
 * ke produk. Sales, sumber, dan status order/pembayaran untuk SEMUA baris
 * sudah ditentukan tetap (bukan dari file): lihat konstanta di bawah.
 *
 * Pemetaan kota->produk dikonfirmasi manual ke pemilik repo (2026-10-09) -
 * dua di antaranya ambigu waktu diperiksa: "Semarang" cuma match ke produk
 * yang statusnya nonaktif (tetap dipakai sesuai arahan), dan "BUKU TP" tidak
 * match produk aktif manapun secara persis (dipetakan ke "Buku Strategi
 * Akuisisi Properti" sesuai arahan).
 */
class ImportLeadLpwaEka extends Command
{
    protected $signature = 'import:lead-lpwa-eka
        {--file= : Path ke file xlsx (default: file yang diberikan 2026-10-09)}
        {--dry-run : Cuma tampilkan ringkasan, tidak menulis apapun ke database}';

    protected $description = 'Import lead (phone, name, kota) ke lead_lpwas + buat order pending/unpaid per kota untuk sales Eka';

    private const SALES_ID = 21; // eka
    private const SUMBER = 'lpwa';
    private const UTM_SOURCE = 'lpwa';

    /** Kota (persis seperti di kolom Excel) -> id produk. Dikonfirmasi manual. */
    private const KOTA_PRODUK_ID = [
        'Sidoarjo' => 47,  // Seminar Ternak Properti Sidoarjo (AS)
        'Cirebon' => 223,  // Seminar Ternak Properti Cirebon (AS)
        'Surabaya' => 48,  // Seminar Ternak Properti Surabaya (AS)
        'Semarang' => 50,  // Seminar Ternak Properti Semarang (AS) - NONAKTIF, tetap dipakai sesuai arahan
        'BUKU TP' => 10,   // Buku Strategi Akuisisi Properti
    ];

    private array $kodeOrderCounterByDate = [];

    public function handle(): int
    {
        $file = $this->option('file') ?: 'C:\\Users\\UsEr\\Downloads\\file ekaeka (4).xlsx';
        $dryRun = (bool) $this->option('dry-run');

        if (!file_exists($file)) {
            $this->error("File tidak ditemukan: {$file}");
            return self::FAILURE;
        }

        $this->info(($dryRun ? '[DRY-RUN] ' : '') . "Membaca file: {$file}");

        $spreadsheet = IOFactory::load($file);
        $sheet = $spreadsheet->getActiveSheet();
        $highestRow = $sheet->getHighestRow();

        $produkCache = Produk::whereIn('id', array_values(self::KOTA_PRODUK_ID))->get(['id', 'nama', 'harga_asli'])->keyBy('id');

        $rows = [];
        for ($row = 2; $row <= $highestRow; $row++) { // row 1 = header
            $phone = trim((string) $sheet->getCell("A{$row}")->getValue());
            $name = trim((string) $sheet->getCell("B{$row}")->getValue());
            $kota = trim((string) $sheet->getCell("C{$row}")->getValue());

            if ($phone === '') {
                continue;
            }

            $rows[] = [
                'row' => $row,
                'wa' => $this->normWa($phone),
                'nama' => $name !== '' ? $name : 'Customer',
                'kota' => $kota,
            ];
        }

        $this->info('Total baris data: ' . count($rows));

        if ($dryRun) {
            foreach ($rows as $r) {
                $produkId = self::KOTA_PRODUK_ID[$r['kota']] ?? null;
                $produkNama = $produkId ? ($produkCache[$produkId]->nama ?? '?') : '(kota tidak dipetakan)';
                $this->line("row {$r['row']}: wa={$r['wa']} nama={$r['nama']} kota={$r['kota']} -> produk: {$produkNama}");
            }
            $this->info('[DRY-RUN] Tidak ada yang ditulis ke database.');
            return self::SUCCESS;
        }

        $leadDibuat = 0;
        $leadDilewati = 0;
        $customerBaru = 0;
        $orderDibuat = 0;
        $orderDilewati = 0;
        $kotaTakDipetakan = 0;

        DB::transaction(function () use (
            $rows,
            $produkCache,
            &$leadDibuat,
            &$leadDilewati,
            &$customerBaru,
            &$orderDibuat,
            &$orderDilewati,
            &$kotaTakDipetakan
        ) {
            foreach ($rows as $r) {
                $produkId = self::KOTA_PRODUK_ID[$r['kota']] ?? null;
                $produk = $produkId ? ($produkCache[$produkId] ?? null) : null;

                // --- Lead LPWA (selalu, idempotent berdasarkan no_wa+lokasi) ---
                $leadSudahAda = LeadLpwa::where('no_wa', $r['wa'])->where('lokasi', $r['kota'])->exists();
                if ($leadSudahAda) {
                    $leadDilewati++;
                } else {
                    LeadLpwa::create([
                        'nama' => $r['nama'],
                        'no_wa' => $r['wa'],
                        'produk_text' => $produk->nama ?? null,
                        'lokasi' => $r['kota'],
                        'sumber' => self::SUMBER,
                        'sales_id' => self::SALES_ID,
                    ]);
                    $leadDibuat++;
                }

                if (!$produk) {
                    $kotaTakDipetakan++;
                    $this->warn("row {$r['row']}: kota \"{$r['kota']}\" tidak dipetakan ke produk - order tidak dibuat.");
                    continue;
                }

                // --- Order (skip kalau customer ini sudah punya order aktif utk produk sama) ---
                $customer = Customer::where('wa', $r['wa'])->where('status', '!=', 'N')->first();

                if ($customer) {
                    $sudahAdaOrderAktif = OrderCustomer::where('customer', $customer->id)
                        ->where('produk', $produk->id)
                        ->where('status', '!=', 'N')
                        ->exists();
                    if ($sudahAdaOrderAktif) {
                        $orderDilewati++;
                        continue;
                    }
                } else {
                    $customer = Customer::create([
                        'nama' => $r['nama'],
                        'wa' => $r['wa'],
                        'status' => '1',
                        'keanggotaan' => 'basic',
                        'customer_type' => 'lead',
                        'status_order' => json_encode([$produk->id]),
                        'sales_id' => self::SALES_ID,
                        'create_at' => now(),
                        'update_at' => now(),
                    ]);
                    $customerBaru++;
                }

                $now = now();
                $kodeOrder = $this->generateKodeOrder($now->format('Y-m-d'));
                $harga = (string) ((float) ($produk->harga_asli ?? 0));

                OrderCustomer::create([
                    'customer' => $customer->id,
                    'sales_id' => self::SALES_ID,
                    'produk' => $produk->id,
                    'kode_order' => $kodeOrder,
                    'tanggal' => $now,
                    'harga' => $harga,
                    'total_harga' => $harga,
                    'ongkir' => '0',
                    'sumber' => self::SUMBER,
                    'create_at' => $now,
                    'update_at' => $now,
                    'status' => '1',
                    'status_pembayaran' => null, // null = Unpaid
                    'status_order' => '1', // 1 = Pending
                    'custom_value' => json_encode(['kode_order' => $kodeOrder]),
                    'utm_source' => self::UTM_SOURCE,
                    'business_unit_id' => 1,
                ]);
                $orderDibuat++;
            }
        });

        $this->newLine();
        $this->info("Lead baru dibuat: {$leadDibuat}. Lead dilewati (sudah ada): {$leadDilewati}.");
        $this->info("Customer baru dibuat: {$customerBaru}.");
        $this->info("Order baru dibuat: {$orderDibuat}. Order dilewati (sudah ada order aktif): {$orderDilewati}.");
        $this->info("Baris dengan kota tidak dipetakan ke produk: {$kotaTakDipetakan}.");

        return self::SUCCESS;
    }

    private function normWa(string $v): string
    {
        $s = preg_replace('/\D/', '', $v);
        if (str_starts_with($s, '0')) {
            $s = '62' . substr($s, 1);
        } elseif (!str_starts_with($s, '62')) {
            $s = '62' . ltrim($s, '0');
        }
        return $s;
    }

    private function generateKodeOrder(string $tanggal): string
    {
        $d = date('dmy', strtotime($tanggal));
        if (!isset($this->kodeOrderCounterByDate[$d])) {
            $prefix = 'ORD' . $d;
            $max = DB::table('order_customer')
                ->where('kode_order', 'like', $prefix . '%')
                ->max('kode_order');
            $seq = $max ? (int) substr($max, -4) : 0;
            $this->kodeOrderCounterByDate[$d] = $seq;
        }
        $this->kodeOrderCounterByDate[$d]++;
        return sprintf('ORD%s%04d', $d, $this->kodeOrderCounterByDate[$d]);
    }
}
