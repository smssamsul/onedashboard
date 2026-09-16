<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Klasifikasi 1 pesan customer jadi salah satu kategori aktivitas/intent
 * yang dipakai LeadPointScoringService untuk menghitung skor lead (lihat
 * LeadPointScoringService::POIN untuk nilai poin tiap kategori).
 *
 * Menggantikan ClaudeChatSentimentService (4 kategori: hot/warm/neutral/
 * negatif) dengan taksonomi yang jauh lebih rinci sesuai tabel scoring yang
 * diminta user - service lama dibiarkan ada (tidak dipakai lagi di alur
 * baru) supaya tidak ada breaking change kalau ada bagian lain yang lupa
 * masih mereferensikannya.
 */
class LeadActivityClassifierService
{
    private const SYSTEM_PROMPT = <<<'PROMPT'
Kamu adalah AI yang mengklasifikasikan SATU pesan chat dari calon customer
(lead) sebuah bisnis seminar/workshop properti, ke SATU kategori aktivitas
dari daftar berikut. Jawab HANYA dengan kode kategorinya (satu kata/frasa
snake_case persis seperti di daftar), tanpa penjelasan apapun.

Kategori POSITIF (menunjukkan minat/progres ke arah closing):
- sapaan_singkat   : cuma membalas sapaan atau jawaban pendek tanpa isi (mis. "oke", "iya", "halo")
- minat_produk     : menunjukkan ketertarikan umum ke produk/acaranya
- tanya_materi     : bertanya soal materi/isi acara
- tanya_jadwal     : bertanya kapan/tanggal/jadwal acara
- tanya_benefit    : bertanya benefit, fasilitas, atau keuntungan ikut acara
- tanya_harga      : bertanya harga atau biaya
- tanya_pembayaran : bertanya CARA membayar (transfer kemana, metode apa)
- kirim_rekening   : memberi nomor rekening/bukti transfer/data pembayaran
- minta_daftar     : minta dibantu proses pendaftaran
- tentukan_jadwal  : sudah memastikan/memilih jadwal tertentu untuk ikut
- siap_beli        : menyatakan sudah siap/mau membeli atau daftar sekarang

Kategori NEGATIF (menjauh dari closing):
- menolak          : menolak tawaran secara eksplisit
- belum_tertarik   : bilang belum tertarik / tidak berminat
- nanti_dulu       : minta ditunda, mau pikir-pikir dulu
- tidak_ada_budget : bilang tidak ada dana/budget
- batal_daftar     : membatalkan pendaftaran yang sudah dibuat

Kalau tidak cocok satupun (basa-basi, di luar topik, tidak jelas maksudnya):
- netral

Balas HANYA dengan salah satu dari 17 kode di atas.
PROMPT;

    public const KATEGORI_VALID = [
        'sapaan_singkat', 'minat_produk', 'tanya_materi', 'tanya_jadwal', 'tanya_benefit',
        'tanya_harga', 'tanya_pembayaran', 'kirim_rekening', 'minta_daftar', 'tentukan_jadwal', 'siap_beli',
        'menolak', 'belum_tertarik', 'nanti_dulu', 'tidak_ada_budget', 'batal_daftar',
        'netral',
    ];

    /**
     * Versi batch/paralel dari classify() - dipakai backfill supaya tidak
     * perlu ribuan request berurutan (bisa berjam-jam). $messages: array
     * asosiatif [key => teks_pesan]. Return: [key => kategori].
     */
    public function classifyMany(array $messages): array
    {
        if (empty($messages)) {
            return [];
        }

        $responses = Http::pool(function ($pool) use ($messages) {
            foreach ($messages as $key => $text) {
                $pool->as($key)
                    ->withHeaders([
                        'x-api-key' => config('services.anthropic.key'),
                        'anthropic-version' => '2023-06-01',
                        'content-type' => 'application/json',
                    ])
                    ->post('https://api.anthropic.com/v1/messages', [
                        'model' => 'claude-haiku-4-5-20251001',
                        'system' => self::SYSTEM_PROMPT,
                        'messages' => [['role' => 'user', 'content' => (string) $text]],
                        'temperature' => 0,
                        'max_tokens' => 12,
                    ]);
            }
        });

        $hasil = [];
        foreach ($messages as $key => $text) {
            $response = $responses[$key] ?? null;
            $kategori = 'netral';
            try {
                if ($response && $response->successful()) {
                    $kategori = trim(strtolower($response->json('content.0.text') ?? 'netral'));
                    if (!in_array($kategori, self::KATEGORI_VALID, true)) {
                        $kategori = 'netral';
                    }
                    AiUsageLogger::catat('lead_activity_classifier', 'claude-haiku-4-5-20251001', $response->json('usage'), sukses: true);
                } else {
                    AiUsageLogger::catat('lead_activity_classifier', 'claude-haiku-4-5-20251001', null, sukses: false);
                }
            } catch (\Throwable $e) {
                Log::channel('ai')->error('LeadActivityClassifierService: error batch', [
                    'error' => $e->getMessage(),
                ]);
            }
            $hasil[$key] = $kategori;
        }

        return $hasil;
    }

    public function classify(string $message): string
    {
        try {
            $response = Http::withHeaders([
                'x-api-key' => config('services.anthropic.key'),
                'anthropic-version' => '2023-06-01',
                'content-type' => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model' => 'claude-haiku-4-5-20251001',
                'system' => self::SYSTEM_PROMPT,
                'messages' => [
                    ['role' => 'user', 'content' => $message],
                ],
                'temperature' => 0,
                'max_tokens' => 12,
            ]);

            if ($response->successful()) {
                $kategori = trim(strtolower($response->json('content.0.text') ?? 'netral'));
                if (!in_array($kategori, self::KATEGORI_VALID, true)) {
                    $kategori = 'netral';
                }

                AiUsageLogger::catat('lead_activity_classifier', 'claude-haiku-4-5-20251001', $response->json('usage'), sukses: true);

                return $kategori;
            }

            Log::channel('ai')->error('LeadActivityClassifierService: API gagal', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            AiUsageLogger::catat('lead_activity_classifier', 'claude-haiku-4-5-20251001', null, sukses: false);

            return 'netral';
        } catch (\Throwable $e) {
            Log::channel('ai')->error('LeadActivityClassifierService: error', [
                'error' => $e->getMessage(),
                'message' => substr($message, 0, 100),
            ]);
            AiUsageLogger::catat('lead_activity_classifier', 'claude-haiku-4-5-20251001', null, sukses: false);

            return 'netral';
        }
    }
}
