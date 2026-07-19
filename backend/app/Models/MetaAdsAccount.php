<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdsAccount extends Model
{
    use HasFactory;

    protected $table = 'meta_ads_accounts';

    public $timestamps = false;

    protected $fillable = [
        'nama',
        'ad_account_id',
        'access_token',
        'app_id',
        'app_secret',
        'business_id',
        'currency',
        'is_active',
        'last_synced_at',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'access_token' => 'encrypted',
        'app_secret' => 'encrypted',
        'is_active' => 'boolean',
        'last_synced_at' => 'datetime',
    ];

    protected $hidden = [
        'access_token',
        'app_secret',
    ];

    protected $appends = [
        'has_token',
    ];

    public function campaigns()
    {
        return $this->hasMany(MetaAdCampaign::class, 'meta_ads_account_id');
    }

    public function insightsDaily()
    {
        return $this->hasMany(MetaAdInsightDaily::class, 'meta_ads_account_id');
    }

    public function getHasTokenAttribute(): bool
    {
        return !empty($this->attributes['access_token'] ?? null);
    }
}
