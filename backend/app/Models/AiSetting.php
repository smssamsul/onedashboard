<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    use HasFactory;

    protected $table = 'ai_setting';

    public $timestamps = false;

    protected $fillable = [
        'prompt',
        'prompt_cold',
        'prompt_warm',
        'woowa_key',
        'is_on',
        'intent_on',
        'business_unit_id',
    ];

    protected $casts = [
        'is_on' => 'boolean',
        'intent_on' => 'boolean',
    ];

    /**
     * Relasi ke UnitBisnis (tenant)
     */
    public function businessUnit()
    {
        return $this->belongsTo(UnitBisnis::class, 'business_unit_id', 'id');
    }

    /**
     * Switch "Balasan AI" di menu AI Setting - khusus untuk AI yang
     * mengirim balasan langsung ke customer (chatbot WhatsApp otomatis,
     * simulasi chat). TIDAK mempengaruhi servis intent (lihat
     * isIntentEnabled()) - sengaja dipisah supaya balasan otomatis bisa
     * dimatikan (mis. mau di-handle manual oleh sales) tanpa ikut
     * menghentikan klasifikasi/skor lead dan analisa yang jalan di
     * belakang layar.
     *
     * Belum ada baris ai_setting sama sekali dianggap OFF (aman by default).
     */
    public static function isReplyEnabled(): bool
    {
        $setting = static::first();

        return (bool) ($setting && $setting->is_on);
    }

    /**
     * Switch "Servis Intent AI" di menu AI Setting - untuk AI yang bekerja
     * di belakang layar (bukan balasan langsung ke customer): klasifikasi
     * aktivitas/intent lead (LeadActivityClassifierService), analisa
     * percakapan (LeadConversationAnalysisService), analisa Meta Ads
     * (AnalisaMetaAdsService), dan intent/sentiment classifier lama. Lihat
     * isReplyEnabled() untuk switch balasan chatbot yang terpisah.
     *
     * Default true (dan belum ada baris ai_setting dianggap ON) supaya
     * servis intent tidak tiba-tiba berhenti untuk instalasi yang sudah
     * berjalan sebelum kolom intent_on ada.
     */
    public static function isIntentEnabled(): bool
    {
        $setting = static::first();

        return !$setting || $setting->intent_on !== false;
    }
}
