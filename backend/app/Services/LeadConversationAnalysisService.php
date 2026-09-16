<?php

namespace App\Services;

use App\Models\DetailPercakapan;
use App\Models\LeadLpwa;
use App\Models\Percakapan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Analisa naratif per-lead (bukan cuma skor angka) - dipakai di panel kanan
 * menu Analisa Leads: ringkasan, potensi, keberatan/objection, dan
 * rekomendasi tindak lanjut, ditulis AI dari isi percakapan.
 *
 * Sengaja on-demand (dipanggil dari tombol "Analisa Ulang" per lead, atau
 * dari job harian untuk lead aktif - lihat DailyLeadAnalysisRefresh) -
 * BUKAN dijalankan tiap pesan masuk seperti skor poin, supaya tidak
 * memanggil AI ribuan kali per hari tanpa perlu. Pakai model paling
 * murah (Haiku) - narasi ringkas tidak butuh model yang lebih mahal.
 */
class LeadConversationAnalysisService
{
    private const MAKS_PESAN = 60;

    private const SYSTEM_PROMPT = <<<'PROMPT'
Kamu adalah asisten sales yang menganalisa percakapan WhatsApp antara tim
sales dan calon customer (lead) sebuah bisnis seminar/workshop properti.
Baca transkrip percakapan dan data lead yang diberikan, lalu balas HANYA
dengan JSON (tanpa markdown/code fence, tanpa penjelasan lain) persis
format berikut:

{"ringkasan":"...","potensi":"...","keberatan":"...","rekomendasi":"..."}

- ringkasan   : 1-2 kalimat, di titik mana percakapan ini sekarang.
- potensi     : 1-2 kalimat, sinyal minat/ketertarikan yang terlihat (atau
                "Belum ada sinyal minat yang jelas" kalau memang tidak ada).
- keberatan   : 1-2 kalimat, keberatan/keraguan yang disampaikan customer
                (atau "Belum ada keberatan yang disampaikan" kalau tidak ada).
- rekomendasi : 1-2 kalimat, saran tindak lanjut KONKRET buat sales -
                bukan saran generik, harus nyambung ke isi percakapan ini.

Jawab dalam Bahasa Indonesia, singkat dan langsung ke inti.
PROMPT;

    public function analyzeAndSave(Percakapan $percakapan): ?array
    {
        try {
            $hasil = $this->analyze($percakapan);
        } catch (\Throwable $e) {
            Log::channel('ai')->error('LeadConversationAnalysisService: gagal', [
                'percakapan_id' => $percakapan->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }

        if ($hasil === null) {
            return null;
        }

        $this->simpanHasil($percakapan, $hasil);

        return $hasil;
    }

    /**
     * Versi batch/paralel - dipakai job harian (lihat DailyLeadAnalysisRefresh)
     * supaya ratusan lead aktif tidak diproses berurutan satu-satu.
     * Return: jumlah yang berhasil dianalisa.
     */
    public function analyzeManyAndSave($percakapanList): int
    {
        $payload = [];
        foreach ($percakapanList as $percakapan) {
            $konteks = $this->buildKonteks($percakapan);
            if ($konteks !== null) {
                $payload[$percakapan->id] = $konteks;
            }
        }

        if (empty($payload)) {
            return 0;
        }

        $responses = Http::pool(function ($pool) use ($payload) {
            foreach ($payload as $id => $konteks) {
                $pool->as($id)
                    ->withHeaders([
                        'x-api-key' => config('services.anthropic.key'),
                        'anthropic-version' => '2023-06-01',
                        'content-type' => 'application/json',
                    ])
                    ->post('https://api.anthropic.com/v1/messages', [
                        'model' => 'claude-haiku-4-5-20251001',
                        'system' => self::SYSTEM_PROMPT,
                        'messages' => [['role' => 'user', 'content' => $konteks]],
                        'temperature' => 0,
                        'max_tokens' => 400,
                    ]);
            }
        });

        $berhasil = 0;
        $percakapanById = collect($percakapanList)->keyBy('id');
        foreach ($responses as $id => $response) {
            $percakapan = $percakapanById->get($id);
            if (!$percakapan) {
                continue;
            }

            $hasil = $this->parseResponse($response, (int) $id);
            if ($hasil !== null) {
                $this->simpanHasil($percakapan, $hasil);
                $berhasil++;
            }
        }

        return $berhasil;
    }

    private function simpanHasil(Percakapan $percakapan, array $hasil): void
    {
        $narasi = "Ringkasan: {$hasil['ringkasan']}\nPotensi: {$hasil['potensi']}\nKeberatan: {$hasil['keberatan']}\nRekomendasi: {$hasil['rekomendasi']}";
        $percakapan->update([
            'ai_analysis' => $narasi,
            'ai_analysis_at' => now(),
        ]);
    }

    private function analyze(Percakapan $percakapan): ?array
    {
        $konteks = $this->buildKonteks($percakapan);
        if ($konteks === null) {
            return null;
        }

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'system' => self::SYSTEM_PROMPT,
            'messages' => [['role' => 'user', 'content' => $konteks]],
            'temperature' => 0,
            'max_tokens' => 400,
        ]);

        return $this->parseResponse($response, $percakapan->id);
    }

    private function buildKonteks(Percakapan $percakapan): ?string
    {
        $pesan = DetailPercakapan::where('id_percakapan', $percakapan->id)
            ->orderByDesc('created_at')
            ->limit(self::MAKS_PESAN)
            ->get(['sender_type', 'message_text', 'created_at'])
            ->reverse()
            ->values();

        if ($pesan->isEmpty()) {
            return null;
        }

        $lead = LeadLpwa::where('no_wa', $percakapan->phone_number)->first(['lokasi', 'sumber', 'produk_text']);

        $transkrip = $pesan->map(function ($p) {
            $peran = $p->sender_type === 'customer' ? 'Customer' : ($p->sender_type === 'sales' ? 'Sales' : 'AI');
            return "{$peran}: {$p->message_text}";
        })->implode("\n");

        return "Data lead - Nama: {$percakapan->name}, Lokasi: " . ($lead->lokasi ?? '-')
            . ", Sumber: " . ($lead->sumber ?? '-') . ", Minat: " . ($lead->produk_text ?? '-')
            . ", Skor saat ini: {$percakapan->lead_score}\n\nTranskrip percakapan:\n{$transkrip}";
    }

    private function parseResponse($response, int $percakapanId): ?array
    {
        if (!$response->successful()) {
            Log::channel('ai')->error('LeadConversationAnalysisService: API gagal', [
                'percakapan_id' => $percakapanId,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            AiUsageLogger::catat('lead_conversation_analysis', 'claude-haiku-4-5-20251001', null, sukses: false);
            return null;
        }

        AiUsageLogger::catat('lead_conversation_analysis', 'claude-haiku-4-5-20251001', $response->json('usage'), sukses: true);

        $teks = trim($response->json('content.0.text') ?? '');
        // Kadang model tetap bungkus JSON pakai ```json ... ``` walau sudah dilarang - lepas dulu.
        $teks = preg_replace('/^```(?:json)?\s*|\s*```$/', '', $teks);

        $parsed = json_decode($teks, true);
        if (!is_array($parsed) || !isset($parsed['ringkasan'])) {
            Log::channel('ai')->warning('LeadConversationAnalysisService: output bukan JSON valid', [
                'percakapan_id' => $percakapanId,
                'raw' => substr($teks, 0, 300),
            ]);
            return null;
        }

        return [
            'ringkasan' => (string) ($parsed['ringkasan'] ?? ''),
            'potensi' => (string) ($parsed['potensi'] ?? ''),
            'keberatan' => (string) ($parsed['keberatan'] ?? ''),
            'rekomendasi' => (string) ($parsed['rekomendasi'] ?? ''),
        ];
    }
}
