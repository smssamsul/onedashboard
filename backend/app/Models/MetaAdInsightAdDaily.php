<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Insight harian per iklan. Grain-nya satu baris per ad_id per tanggal —
 * berbeda dari MetaAdInsightDaily yang ber-grain campaign.
 */
class MetaAdInsightAdDaily extends Model
{
    use HasFactory;

    protected $table = 'meta_ad_insights_ad_daily';

    public $timestamps = false;

    protected $fillable = [
        'meta_ads_account_id',
        'ad_id',
        'ad_set_id',
        'campaign_id',
        'date',
        'spend',
        'impressions',
        'clicks',
        'link_clicks',
        'cpc',
        'cpm',
        'ctr',
        'conversions',
        'leads',
        'contact',
        'conversion_value',
        'raw_actions',
        'create_at',
        'update_at',
    ];

    /** Alasan format 'Y-m-d' polos sama seperti di MetaAdInsightDaily. */
    protected $casts = [
        'date' => 'date:Y-m-d',
        'raw_actions' => 'array',
    ];

    public function iklan()
    {
        return $this->belongsTo(MetaAd::class, 'ad_id', 'ad_id');
    }
}
