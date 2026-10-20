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
 * Import file lead manual sales Eka dari sumber Meta Ads (kolom: phone, name,
 * kota, kode versi iklan, "Meta Ads" literal) - format beda dari
 * import:lead-lpwa-eka (phone/name/kota polos tanpa kode versi).
 *
 * Aturan dikonfirmasi manual ke pemilik repo (2026-10-13):
 *  - sumber   = "meta ads {kode versi}" (mis. "meta ads v2"), atau cuma
 *               "meta ads" kalau barisnya BUKU (tidak ada kode versi).
 *  - utm_source = NULL untuk baris seminar, "meta-ads" khusus baris BUKU.
 *  - lead_lpwas dibuat untuk SEMUA baris KECUALI baris BUKU.
 *  - Kota "BUKU"/"buku" disamakan dengan "BUKU TP" (produk id 10).
 *  - Kota "Yogyakarta" baru, dipetakan ke produk id 227.
 */
class ImportLeadMetaAdsEka extends Command
{
    protected $signature = 'import:lead-meta-ads-eka
        {--file= : Path ke file xlsx}
        {--dry-run : Cuma tampilkan ringkasan, tidak menulis apapun ke database}';

    protected $description = 'Import lead (phone, name, kota, kode versi) sumber Meta Ads ke lead_lpwas + order pending/unpaid untuk sales Eka';

    private const SALES_ID = 21; // eka
    private const PRODUK_BUKU_ID = 10; // Buku Strategi Akuisisi Properti

    /** Kota (kanonik) -> id produk. Dikonfirmasi manual ke pemilik repo. */
    private const KOTA_PRODUK_ID = [
        'Sidoarjo' => 47,
        'Cirebon' => 223,
        'Surabaya' => 48,
        'Semarang' => 50,
        'Yogyakarta' => 227,
        'Bali' => 226,
        'Mataram' => 225,   // "Mataram" di Excel sering typo "Matarram" - lihat ALIAS_KOTA
        'BUKU TP' => self::PRODUK_BUKU_ID,
    ];

    /** Alias kota (huruf kecil) -> kota kanonik di KOTA_PRODUK_ID. */
    private const ALIAS_KOTA = [
        'buku' => 'BUKU TP',
        'matarram' => 'Mataram', // typo umum di file manual tim (2026-10-14)
        'buku tp' => 'BUKU TP',
    ];

    private const LABEL_PRODUK_SEMINAR = 'Seminar Ternak Properti';

    private array $kodeOrderCounterByDate = [];

    public function handle(): int
    {
        $file = $this->option('file');
        $dryRun = (bool) $this->option('dry-run');

        if (!$file || !file_exists($file)) {
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
            $kodeVersi = strtolower(trim((string) $sheet->getCell("D{$row}")->getValue()));

            if ($phone === '') {
                continue;
            }

            $kotaKanonik = $this->normKota($kota);
            $isBuku = $kotaKanonik === 'BUKU TP';

            $rows[] = [
                'row' => $row,
                'wa' => $this->normWa($phone),
                'nama' => $name !== '' ? $name : 'Customer',
                'kota' => $kotaKanonik,
                'kode_versi' => $kodeVersi,
                'is_buku' => $isBuku,
                'sumber' => $isBuku ? 'meta ads' : trim('meta ads ' . $kodeVersi),
                'utm_source' => $isBuku ? 'meta-ads' : null,
            ];
        }

        $this->info('Total baris data: ' . count($rows));

        if ($dryRun) {
            foreach ($rows as $r) {
                $produkId = self::KOTA_PRODUK_ID[$r['kota']] ?? null;
                $produkNama = $produkId ? ($produkCache[$produkId]->nama ?? '?') : '(kota tidak dipetakan)';
                $this->line(
                    "row {$r['row']}: wa={$r['wa']} nama={$r['nama']} kota={$r['kota']} sumber=\"{$r['sumber']}\" " .
                    "utm_source=" . ($r['utm_source'] ?? 'NULL') . " lead_lpwa=" . ($r['is_buku'] ? 'skip' : 'buat') .
                    " -> produk: {$produkNama}"
                );
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

                // --- Lead LPWA: SEMUA baris KECUALI buku ---
                if (!$r['is_buku']) {
                    $leadSudahAda = LeadLpwa::where('no_wa', $r['wa'])->where('lokasi', $r['kota'])->exists();
                    if ($leadSudahAda) {
                        $leadDilewati++;
                    } else {
                        LeadLpwa::create([
                            'nama' => $r['nama'],
                            'no_wa' => $r['wa'],
                            'produk_text' => self::LABEL_PRODUK_SEMINAR,
                            'lokasi' => $r['kota'],
                            'sumber' => $r['sumber'],
                            'sales_id' => self::SALES_ID,
                        ]);
                        $leadDibuat++;
                    }
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
                    'sumber' => $r['sumber'],
                    'create_at' => $now,
                    'update_at' => $now,
                    'status' => '1',
                    'status_pembayaran' => null, // null = Unpaid
                    'status_order' => '1', // 1 = Pending
                    'custom_value' => json_encode(['kode_order' => $kodeOrder]),
                    'utm_source' => $r['utm_source'],
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

    private function normKota(string $kota): string
    {
        $alias = self::ALIAS_KOTA[strtolower($kota)] ?? null;
        if ($alias) {
            return $alias;
        }

        foreach (array_keys(self::KOTA_PRODUK_ID) as $kanonik) {
            if (strcasecmp($kanonik, $kota) === 0) {
                return $kanonik;
            }
        }

        return $kota;
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
