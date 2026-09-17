<?php

namespace App\Services;

use App\Models\DetailPercakapan;
use App\Models\LeadLpwa;
use App\Models\MetaAdInsightDaily;
use App\Models\OrderCustomer;
use App\Models\Produk;

/**
 * Ringkasan performa seminar/produk untuk Dashboard - gabung data Meta Ads
 * (biaya, CTWA/contact), Order (buyer, omzet), lead masuk (lead_lpwas), dan
 * kendala lead (intent negatif dari LeadActivityClassifierService).
 *
 * Dikelompokkan per KOTA (dari LokasiKeywordService, sama seperti Meta Ads
 * Report) atau grup non-kota Buku/Reseat - bukan per baris produk individual,
 * karena satu kota/kategori biasanya punya beberapa varian produk aktif
 * sekaligus (lihat WorkshopReportController utk contoh serupa).
 *
 * Semua penautan lead->produk/kota TIDAK pakai foreign key (memang tidak
 * ada di skema) - dicocokkan lewat teks (nama campaign/produk mengandung
 * nama kota, atau lead_lpwas.lokasi/produk_text mengandung nama kota/
 * kata kunci Buku/Reseat), sama seperti pola yang sudah dipakai
 * MetaAdsPerformanceController & LeadAutoOrderService.
 */
class SeminarInsightService
{
    private const KELOMPOK_NON_KOTA = [
        'buku' => 'Buku',
        'reseat' => 'Reseat',
    ];

    private const KATEGORI_KENDALA = [
        'menolak', 'belum_tertarik', 'nanti_dulu', 'tidak_ada_budget', 'jadwal_tidak_cocok', 'batal_daftar',
    ];

    public function __construct(private LokasiKeywordService $lokasi)
    {
    }

    /** Nama kelompok (kota, atau Buku/Reseat) dari sepotong teks - null kalau tidak match apapun. */
    public function kelompokkan(?string $teks): ?string
    {
        $kota = $this->lokasi->deteksiKota($teks);
        if ($kota) {
            return $kota;
        }

        $lower = mb_strtolower((string) $teks);
        foreach (self::KELOMPOK_NON_KOTA as $kw => $label) {
            if (str_contains($lower, $kw)) {
                return $label;
            }
        }

        return null;
    }

    /** Produk aktif yang namanya match ke suatu kelompok. Return: kelompok => [produk_id, ...]. */
    public function produkPerKelompok(): array
    {
        $produkList = Produk::where('status', '!=', 'N')->get(['id', 'nama']);

        $peta = [];
        foreach ($produkList as $p) {
            $kelompok = $this->kelompokkan($p->nama);
            if ($kelompok) {
                $peta[$kelompok][] = (int) $p->id;
            }
        }

        return $peta;
    }

    /**
     * Ringkasan rentang tanggal (bisa 1 hari atau beberapa hari): biaya +
     * contact(CTWA) dari Meta Ads, buyer + omzet dari order (paid/waiting
     * approval) di rentang itu, plus formula turunan (cost per contact,
     * cost per buyer, conversion rate, ROAS, AOV).
     */
    public function ringkasanRentang(string $dari, string $sampai): array
    {
        $petaProduk = $this->produkPerKelompok();

        $insight = MetaAdInsightDaily::query()
            ->join('meta_ad_campaigns', 'meta_ad_campaigns.campaign_id', '=', 'meta_ad_insights_daily.campaign_id')
            ->whereBetween('meta_ad_insights_daily.date', [$dari, $sampai])
            ->get(['meta_ad_campaigns.name as campaign_nama', 'meta_ad_insights_daily.spend', 'meta_ad_insights_daily.contact']);

        $biaya = [];
        $contact = [];
        foreach ($insight as $row) {
            $kelompok = $this->kelompokkan($row->campaign_nama);
            if (!$kelompok) {
                continue;
            }
            $biaya[$kelompok] = ($biaya[$kelompok] ?? 0) + (float) $row->spend;
            $contact[$kelompok] = ($contact[$kelompok] ?? 0) + (int) $row->contact;
        }

        $buyer = [];
        $omzet = [];
        foreach ($petaProduk as $kelompok => $produkIds) {
            $orders = OrderCustomer::where('status', '!=', 'N')
                ->whereIn('produk', $produkIds)
                ->whereIn('status_pembayaran', ['1', '2'])
                ->whereRaw('SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) BETWEEN ? AND ?', [$dari, $sampai])
                ->get(['total_harga', 'customer']);
            $buyer[$kelompok] = $orders->pluck('customer')->unique()->count();
            $omzet[$kelompok] = $orders->sum(fn ($o) => (float) preg_replace('/[^\d.]/', '', (string) $o->total_harga));
        }

        $semuaKelompok = array_unique(array_merge(array_keys($biaya), array_keys($petaProduk)));

        $hasil = [];
        foreach ($semuaKelompok as $kelompok) {
            $b = $biaya[$kelompok] ?? 0;
            $c = $contact[$kelompok] ?? 0;
            $by = $buyer[$kelompok] ?? 0;
            $o = $omzet[$kelompok] ?? 0;

            $hasil[] = [
                'kelompok' => $kelompok,
                'biaya' => round($b),
                'contact' => $c,
                'buyer' => $by,
                'omzet' => round($o),
                'cost_per_contact' => $c > 0 ? round($b / $c) : null,
                'cost_per_buyer' => $by > 0 ? round($b / $by) : null,
                'conversion_rate_persen' => $c > 0 ? round($by / $c * 100, 1) : null,
                'roas' => $b > 0 ? round($o / $b, 2) : null,
                'aov' => $by > 0 ? round($o / $by) : null,
            ];
        }

        // Buang kelompok yang sama sekali tidak ada aktivitas hari itu (kota
        // di daftar keyword jauh lebih banyak dari yang benar-benar jalan).
        $hasil = array_values(array_filter(
            $hasil,
            fn ($r) => $r['biaya'] > 0 || $r['contact'] > 0 || $r['buyer'] > 0 || $r['omzet'] > 0
        ));

        usort($hasil, fn ($a, $b) => $b['biaya'] <=> $a['biaya']);

        return $hasil;
    }

    /**
     * Leads masuk (dari lead_lpwas, dedup per kelompok+no_wa) vs peserta
     * (customer unik dgn order paid/waiting approval), plus rasio konversi -
     * dibatasi rentang tanggal yang SAMA buat dua-duanya (lead_lpwas pakai
     * created_at, order pakai tanggal) supaya rasionya apple-to-apple,
     * bukan bandingin leads periode X dengan peserta all-time.
     */
    public function leadsVsPeserta(string $dari, string $sampai): array
    {
        $petaProduk = $this->produkPerKelompok();

        $leads = LeadLpwa::whereNotNull('no_wa')->where('no_wa', '!=', '')
            ->whereBetween('created_at', [$dari . ' 00:00:00', $sampai . ' 23:59:59'])
            ->get(['no_wa', 'produk_text', 'lokasi']);

        $leadsPerKelompok = [];
        $sudahDihitung = [];
        foreach ($leads as $lead) {
            $kelompok = $this->kelompokkan($lead->lokasi) ?? $this->kelompokkan($lead->produk_text);
            if (!$kelompok) {
                continue;
            }
            $key = $kelompok . '|' . $lead->no_wa;
            if (isset($sudahDihitung[$key])) {
                continue;
            }
            $sudahDihitung[$key] = true;
            $leadsPerKelompok[$kelompok] = ($leadsPerKelompok[$kelompok] ?? 0) + 1;
        }

        $pesertaPerKelompok = [];
        foreach ($petaProduk as $kelompok => $produkIds) {
            $pesertaPerKelompok[$kelompok] = OrderCustomer::where('status', '!=', 'N')
                ->whereIn('produk', $produkIds)
                ->whereIn('status_pembayaran', ['1', '2'])
                ->whereRaw('SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) BETWEEN ? AND ?', [$dari, $sampai])
                ->distinct('customer')
                ->count('customer');
        }

        $semuaKelompok = array_unique(array_merge(array_keys($leadsPerKelompok), array_keys($pesertaPerKelompok)));

        $hasil = [];
        foreach ($semuaKelompok as $kelompok) {
            $l = $leadsPerKelompok[$kelompok] ?? 0;
            $p = $pesertaPerKelompok[$kelompok] ?? 0;
            // lead_lpwas cuma nangkep lead yang chat pakai format baku
            // ("Saya mau ikut X di Y" - lihat ChatExtractorService), jadi
            // sering jauh lebih sedikit dari peserta riil (yang dihitung
            // all-time dari order). Kalau peserta > leads, rasio-nya tidak
            // bisa diandalkan (>100%) - jangan ditampilkan sebagai persen.
            $rasioValid = $l > 0 && $p <= $l;
            $hasil[] = [
                'kelompok' => $kelompok,
                'leads_masuk' => $l,
                'peserta' => $p,
                'rasio_persen' => $rasioValid ? round($p / $l * 100, 1) : null,
                'data_leads_tidak_lengkap' => $l > 0 && $p > $l,
            ];
        }

        $hasil = array_values(array_filter($hasil, fn ($r) => $r['leads_masuk'] > 0 || $r['peserta'] > 0));

        usort($hasil, fn ($a, $b) => $b['peserta'] <=> $a['peserta']);

        return $hasil;
    }

    /**
     * Breakdown kendala (intent negatif) per kelompok - all-time, supaya
     * kelihatan pola "rata-rata kendalanya apa" (jadwal/biaya/dll) per
     * kota/kategori produk. Dedup per (kelompok, percakapan, kategori) -
     * satu lead yang 2x bilang "belum ada budget" tetap dihitung 1.
     */
    public function kendalaPerKelompok(): array
    {
        $leads = LeadLpwa::whereNotNull('no_wa')->where('no_wa', '!=', '')->get(['no_wa', 'produk_text', 'lokasi']);

        $kelompokPerWa = [];
        foreach ($leads as $lead) {
            $kelompok = $this->kelompokkan($lead->lokasi) ?? $this->kelompokkan($lead->produk_text);
            if ($kelompok) {
                $kelompokPerWa[$lead->no_wa] = $kelompok;
            }
        }

        if (empty($kelompokPerWa)) {
            return [];
        }

        $rows = DetailPercakapan::whereIn('intent', self::KATEGORI_KENDALA)
            ->whereHas('percakapan', function ($q) use ($kelompokPerWa) {
                $q->whereIn('phone_number', array_keys($kelompokPerWa));
            })
            ->with('percakapan:id,phone_number')
            ->get(['id', 'id_percakapan', 'intent']);

        $hitung = [];
        $sudahDihitung = [];
        foreach ($rows as $row) {
            $wa = $row->percakapan->phone_number ?? null;
            $kelompok = $kelompokPerWa[$wa] ?? null;
            if (!$kelompok) {
                continue;
            }
            $key = $kelompok . '|' . $row->id_percakapan . '|' . $row->intent;
            if (isset($sudahDihitung[$key])) {
                continue;
            }
            $sudahDihitung[$key] = true;
            $hitung[$kelompok][$row->intent] = ($hitung[$kelompok][$row->intent] ?? 0) + 1;
        }

        $hasil = [];
        foreach ($hitung as $kelompok => $perIntent) {
            arsort($perIntent);
            $hasil[] = [
                'kelompok' => $kelompok,
                'total_kendala' => array_sum($perIntent),
                'breakdown' => $perIntent,
                'kendala_terbanyak' => array_key_first($perIntent),
            ];
        }

        usort($hasil, fn ($a, $b) => $b['total_kendala'] <=> $a['total_kendala']);

        return $hasil;
    }
}
