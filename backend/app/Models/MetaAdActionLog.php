<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAdActionLog extends Model
{
    use HasFactory;

    protected $table = 'meta_ad_action_logs';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'meta_ads_account_id',
        'campaign_id',
        'action_type',
        'before_value',
        'after_value',
        'status',
        'error_message',
        'create_at',
    ];

    protected $casts = [
        'before_value' => 'array',
        'after_value' => 'array',
    ];

    public function account()
    {
        return $this->belongsTo(MetaAdsAccount::class, 'meta_ads_account_id');
    }
}
