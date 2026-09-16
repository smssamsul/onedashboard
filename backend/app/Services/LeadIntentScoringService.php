<?php

namespace App\Services;

use App\Models\DetailPercakapan;
use App\Models\Percakapan;

/**
 * Skoring lead otomatis berdasarkan intent pesan customer yang SUDAH
 * diklasifikasi per-pesan oleh ClaudeChatSentimentService (dipanggil di
 * PercakapanService::logCustomerMessage, hasilnya tersimpan di
 * detail_percakapan.intent). Service ini cuma menggabungkan (rollup)
 * intent-intent itu jadi satu label per thread - TIDAK memanggil AI lagi,
 * jadi aman & murah dipakai untuk re-scoring massal data lama.
 *
 * Aturan (dari permintaan user, "pakai intent saja"):
 * - low_quality : belum ada satupun pesan dari customer (sama sekali tidak
 *                 merespon).
 * - hot         : ada pesan customer dengan intent "hot" (nanya no rek,
 *                 harga akhir, sepakat deal - definisi yang sama dipakai
 *                 ClaudeChatSentimentService).
 * - warm        : tidak ada "hot", tapi ada pesan dengan intent "warm"
 *                 (nanya jadwal/materi/benefit, minta info lebih lanjut).
 * - cold        : ada pesan customer, tapi semuanya "neutral"/"negatif"/
 *                 belum terklasifikasi (tidak nanya jadwal maupun benefit).
 *
 * Percakapan yang sudah ditandai manual "trash" (spam, dari pembersihan
 * data sebelumnya) SENGAJA tidak ditimpa - itu keputusan manusia, bukan
 * hasil intent.
 */
class LeadIntentScoringService
{
    public const LOW_QUALITY = 'low_quality';
    public const COLD = 'cold';
    public const WARM = 'warm';
    public const HOT = 'hot';

    /** Dipakai juga untuk urutan/sort ("mana yang paling panas"). */
    public const SCORE_MAP = [
        self::LOW_QUALITY => 0,
        self::COLD => 1,
        self::WARM => 2,
        self::HOT => 3,
    ];

    public function computeLabel(int $percakapanId): string
    {
        $intents = DetailPercakapan::where('id_percakapan', $percakapanId)
            ->where('sender_type', 'customer')
            ->pluck('intent');

        if ($intents->isEmpty()) {
            return self::LOW_QUALITY;
        }
        if ($intents->contains('hot')) {
            return self::HOT;
        }
        if ($intents->contains('warm')) {
            return self::WARM;
        }
        return self::COLD;
    }

    /**
     * Hitung ulang & simpan skor satu percakapan. Return null kalau
     * dilewati (status manual "trash").
     */
    public function rescoreAndSave(Percakapan $percakapan): ?string
    {
        if (strtolower(trim((string) $percakapan->status)) === 'trash') {
            return null;
        }

        $label = $this->computeLabel($percakapan->id);
        $percakapan->update([
            'status' => $label,
            'lead_score' => self::SCORE_MAP[$label],
        ]);

        return $label;
    }
}
