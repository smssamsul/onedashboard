<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdSet extends Model
{
    use HasFactory;

    protected $table = 'meta_ad_sets';

    public $timestamps = false;

    protected $fillable = [
        'meta_ad_campaign_id',
        'ad_set_id',
        'name',
        'status',
        'daily_budget',
        'lifetime_budget',
        'billing_event',
        'optimization_goal',
        'targeting',
        'start_time',
        'end_time',
        'raw_payload',
        'synced_at',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'targeting' => 'array',
        'raw_payload' => 'array',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'synced_at' => 'datetime',
    ];

    public function campaign()
    {
        return $this->belongsTo(MetaAdCampaign::class, 'meta_ad_campaign_id');
    }

    public function ads()
    {
        return $this->hasMany(MetaAd::class, 'meta_ad_set_id');
    }
}
