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
        'baileys_quota_max_messages',
        'baileys_quota_window_minutes',
        'auto_followup_enabled',
        'business_unit_id',
    ];

    /**
     * Relasi ke UnitBisnis (tenant)
     */
    public function businessUnit()
    {
        return $this->belongsTo(UnitBisnis::class, 'business_unit_id', 'id');
    }

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

    /**
     * Kuota kirim per session Baileys: [maxPesan, windowMenit]. Dicek di
     * WhatsAppSenderService::sendViaBaileys() sebelum tiap kirim, supaya satu
     * nomor WA tidak dianggap spam oleh WhatsApp (efeknya session ke-logout
     * paksa). Default 20 pesan / 30 menit kalau belum diisi di Setting Sales.
     */
    public static function getBaileysQuota(): array
    {
        $setting = self::first();

        $maxMessages = ($setting && $setting->baileys_quota_max_messages !== null)
            ? (int) $setting->baileys_quota_max_messages
            : 20;

        $windowMinutes = ($setting && $setting->baileys_quota_window_minutes !== null)
            ? (int) $setting->baileys_quota_window_minutes
            : 30;

        return [max(1, $maxMessages), max(1, $windowMinutes)];
    }

    /**
     * Saklar global auto follow-up. NULL (belum pernah diisi) dianggap aktif,
     * supaya instalasi lama yang belum menyentuh setting ini tetap jalan
     * seperti sebelumnya. Dicek di SendFollowupCron sebelum loop produk.
     */
    public static function getAutoFollowupEnabled(): bool
    {
        $setting = self::first();

        if (!$setting || $setting->auto_followup_enabled === null) {
            return true;
        }

        return (bool) $setting->auto_followup_enabled;
    }
}
