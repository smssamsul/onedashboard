<?php

namespace App\Services;

use App\Models\DetailPercakapan;
use App\Models\OrderCustomer;
use App\Models\Percakapan;
use Carbon\Carbon;

/**
 * Skoring lead berbasis POIN (bukan cuma label) - dihitung dari kategori
 * aktivitas/intent tiap pesan customer yang sudah diklasifikasi
 * LeadActivityClassifierService, dikurangi penalti tidak aktif, lalu
 * dipetakan ke label kategori (dipakai tab di menu Analisa Leads).
 *
 * Setiap KATEGORI dihitung SEKALI saja per thread (bukan per-pesan) -
 * kalau customer nanya jadwal 3x, tetap +15 sekali, bukan +45. Ini supaya
 * skor mencerminkan SEBERAPA DALAM progresnya, bukan seberapa cerewet.
 */
class LeadPointScoringService
{
    /** Poin per kategori - lihat tabel yang diminta user. */
    public const POIN = [
        // Positif
        'sapaan_singkat' => 5,
        'minat_produk' => 10,
        'tanya_materi' => 10,
        'tanya_jadwal' => 15,
        'tanya_benefit' => 10,
        'tanya_harga' => 20,
        'tanya_pembayaran' => 20,
        'kirim_rekening' => 30,
        'minta_daftar' => 30,
        'tentukan_jadwal' => 25,
        'siap_beli' => 30,
        // Negatif
        'menolak' => -10,
        'belum_tertarik' => -15,
        'nanti_dulu' => -5,
        'tidak_ada_budget' => -10,
        'batal_daftar' => -20,
        // Tidak ada sinyal
        'netral' => 0,
    ];

    public const LOW_QUALITY = 'low_quality';
    public const COLD = 'cold';
    public const WARM = 'warm';
    public const HOT = 'hot';
    public const CLOSING = 'closing';

    /**
     * Ambang batas label dari skor poin. Angka ini keputusan awal - gampang
     * disesuaikan kalau ternyata terlalu longgar/ketat setelah dipakai.
     */
    private const AMBANG_HOT = 50;
    private const AMBANG_WARM = 20;

    public function computeScore(int $percakapanId): int
    {
        $kategoriUnik = DetailPercakapan::where('id_percakapan', $percakapanId)
            ->where('sender_type', 'customer')
            ->whereNotNull('intent')
            ->distinct()
            ->pluck('intent');

        $skor = 0;
        foreach ($kategoriUnik as $k) {
            $skor += self::POIN[$k] ?? 0;
        }

        return $skor + $this->hitungPenaltiTidakAktif($percakapanId);
    }

    /**
     * Penalti tunggal (bukan akumulasi) berdasarkan tingkat keparahan
     * terbaru - lead yang sudah 30 hari tidak respon kena -20, bukan
     * -2-5-10-15-20 dijumlah semua.
     *
     * CATATAN: "Nomor WA tidak aktif" (-30) dari tabel BELUM diterapkan -
     * sistem saat ini tidak punya sinyal status pengiriman WA per lead yang
     * bisa diandalkan untuk itu.
     */
    private function hitungPenaltiTidakAktif(int $percakapanId): int
    {
        $pesanTerakhirCustomer = DetailPercakapan::where('id_percakapan', $percakapanId)
            ->where('sender_type', 'customer')
            ->max('created_at');

        if (!$pesanTerakhirCustomer) {
            return 0;
        }

        $hari = Carbon::parse($pesanTerakhirCustomer)->diffInDays(now());

        if ($hari >= 30) return -20;
        if ($hari >= 14) return -15;
        if ($hari >= 7) return -10;
        if ($hari >= 3) return -5;
        if ($hari >= 1) return -2;
        return 0;
    }

    public function resolveLabel(int $percakapanId, ?string $phoneNumber, int $skor): string
    {
        $adaPesanCustomer = DetailPercakapan::where('id_percakapan', $percakapanId)
            ->where('sender_type', 'customer')
            ->exists();

        if (!$adaPesanCustomer) {
            return self::LOW_QUALITY;
        }

        if ($phoneNumber && $this->punyaOrderClosing($phoneNumber)) {
            return self::CLOSING;
        }

        if ($skor >= self::AMBANG_HOT) {
            return self::HOT;
        }
        if ($skor >= self::AMBANG_WARM) {
            return self::WARM;
        }
        return self::COLD;
    }

    /** Lead dianggap "closing" kalau punya order dengan status pembayaran Waiting Approval (1) atau Paid (2). */
    private function punyaOrderClosing(string $phoneNumber): bool
    {
        return OrderCustomer::whereHas('customer_rel', function ($q) use ($phoneNumber) {
                $q->where('wa', $phoneNumber);
            })
            ->whereIn('status_pembayaran', ['1', '2'])
            ->where('status', '!=', 'N')
            ->exists();
    }

    /**
     * Hitung ulang & simpan skor+label satu percakapan. Return null kalau
     * dilewati (status manual "trash").
     */
    public function rescoreAndSave(Percakapan $percakapan): ?array
    {
        if (strtolower(trim((string) $percakapan->status)) === 'trash') {
            return null;
        }

        $skor = $this->computeScore($percakapan->id);
        $label = $this->resolveLabel($percakapan->id, $percakapan->phone_number, $skor);

        $percakapan->update([
            'status' => $label,
            'lead_score' => $skor,
        ]);

        return ['label' => $label, 'score' => $skor];
    }
}
