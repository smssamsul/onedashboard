<?php

namespace App\Services;

use App\Models\AiUsageLog;
use Illuminate\Support\Facades\Log;

/**
 * Titik tunggal pencatatan biaya token AI, dipanggil dari tiap service yang
 * memanggil Claude. Lihat config/ai_pricing.php untuk harga per model.
 */
class AiUsageLogger
{
    /**
     * @param  string  $fitur  Nama fitur pemanggil, mis. 'analisa_meta_ads', 'ai_sales_chat'.
     * @param  string  $model  Model id persis seperti yang dikirim ke Anthropic.
     * @param  array|null  $usage  Objek `usage` mentah dari respons Anthropic (snake_case).
     */
    public static function catat(string $fitur, string $model, ?array $usage, bool $sukses = true): void
    {
        $input = (int) ($usage['input_tokens'] ?? 0);
        $output = (int) ($usage['output_tokens'] ?? 0);
        $cacheWrite = (int) ($usage['cache_creation_input_tokens'] ?? 0);
        $cacheRead = (int) ($usage['cache_read_input_tokens'] ?? 0);

        try {
            AiUsageLog::create([
                'fitur' => $fitur,
                'model' => $model,
                'input_tokens' => $input,
                'output_tokens' => $output,
                'cache_creation_tokens' => $cacheWrite,
                'cache_read_tokens' => $cacheRead,
                'estimasi_biaya_usd' => self::hitungBiaya($model, $input, $output, $cacheWrite, $cacheRead),
                'sukses' => $sukses,
            ]);
        } catch (\Throwable $e) {
            // Pencatatan biaya tidak boleh menggagalkan fitur AI itu sendiri.
            Log::channel('ai')->warning('AiUsageLogger: gagal mencatat usage', [
                'fitur' => $fitur,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private static function hitungBiaya(string $model, int $input, int $output, int $cacheWrite, int $cacheRead): float
    {
        $harga = config("ai_pricing.models.{$model}");

        if (!$harga) {
            return 0.0;
        }

        $biaya = ($input / 1_000_000) * $harga['input']
            + ($output / 1_000_000) * $harga['output']
            + ($cacheWrite / 1_000_000) * ($harga['cache_write_5m'] ?? $harga['input'])
            + ($cacheRead / 1_000_000) * ($harga['cache_read'] ?? 0);

        return round($biaya, 6);
    }
}
