<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdInsightDaily extends Model
{
    use HasFactory;

    protected $table = 'meta_ad_insights_daily';

    public $timestamps = false;

    protected $fillable = [
        'meta_ads_account_id',
        'campaign_id',
        'date',
        'spend',
        'impressions',
        'reach',
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

    /**
     * `date` sengaja diserialisasi sebagai 'Y-m-d' polos. Tanpa format
     * eksplisit, cast 'date' dikirim sebagai ISO UTC — di zona Asia/Jakarta
     * tanggal 27 jadi "2026-07-26T17:00:00.000000Z", yaitu tampil mentah
     * di grafik sekaligus mundur satu hari.
     */
    protected $casts = [
        'date' => 'date:Y-m-d',
        'raw_actions' => 'array',
    ];

    public function account()
    {
        return $this->belongsTo(MetaAdsAccount::class, 'meta_ads_account_id');
    }
}
