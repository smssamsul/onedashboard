<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdCampaign extends Model
{
    use HasFactory;

    protected $table = 'meta_ad_campaigns';

    public $timestamps = false;

    protected $fillable = [
        'meta_ads_account_id',
        'campaign_id',
        'name',
        'status',
        'objective',
        'daily_budget',
        'lifetime_budget',
        'buying_type',
        'start_time',
        'stop_time',
        'raw_payload',
        'synced_at',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'raw_payload' => 'array',
        'start_time' => 'datetime',
        'stop_time' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function account()
    {
        return $this->belongsTo(MetaAdsAccount::class, 'meta_ads_account_id');
    }

    public function adSets()
    {
        return $this->hasMany(MetaAdSet::class, 'meta_ad_campaign_id');
    }
}
