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
        'conversion_value',
        'raw_actions',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'date' => 'date',
        'raw_actions' => 'array',
    ];

    public function account()
    {
        return $this->belongsTo(MetaAdsAccount::class, 'meta_ads_account_id');
    }
}
