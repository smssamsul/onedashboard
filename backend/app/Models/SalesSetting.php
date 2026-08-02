<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesSetting extends Model
{
    use HasFactory;

    protected $table = 'sales_setting';

    public $timestamps = false;

    protected $fillable = [
        'token_google',
        'woowa_utama',
        'wa_engine',
        'followup_delay_min',
        'followup_delay_max',
    ];

    /**
     * Get the main Woowa Key from the database.
     * Fallback to the env('WOOWA_KEY') if not found in the database.
     */
    public static function getWoowaUtama(): ?string
    {
        $setting = self::first();
        return ($setting && !empty($setting->woowa_utama)) ? $setting->woowa_utama : env('WOOWA_KEY');
    }

    /**
     * Get the active WA engine ('woowa' or 'baileys').
     * Defaults to 'woowa' if not set.
     */
    public static function getWaEngine(): string
    {
        $setting = self::first();
        return ($setting && !empty($setting->wa_engine)) ? $setting->wa_engine : 'woowa';
    }

    /**
     * Rentang jeda acak (detik) antar pesan follow-up: [min, max].
     * Diambil dari DB; kolom yang masih NULL jatuh ke nilai .env lama supaya
     * instalasi yang belum mengisi setting tetap berperilaku sama.
     *
     * Nilai dinormalkan di sini (bukan di pemanggil) supaya rand() tidak pernah
     * menerima min > max — kombinasi itu melempar error di PHP 8.
     */
    public static function getFollowupDelayRange(): array
    {
        $setting = self::first();

        $min = ($setting && $setting->followup_delay_min !== null)
            ? (int) $setting->followup_delay_min
            : (int) env('FOLLOWUP_DELAY_MIN_SECONDS', 5);

        $max = ($setting && $setting->followup_delay_max !== null)
            ? (int) $setting->followup_delay_max
            : (int) env('FOLLOWUP_DELAY_MAX_SECONDS', 25);

        $min = max(0, $min);
        $max = max($min, $max);

        return [$min, $max];
    }
}
