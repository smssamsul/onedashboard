<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MetaAd extends Model
{
    use HasFactory;

    protected $table = 'meta_ads';

    public $timestamps = false;

    protected $fillable = [
        'meta_ad_set_id',
        'ad_id',
        'name',
        'status',
        'creative_id',
        'creative_payload',
        'raw_payload',
        'synced_at',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'creative_payload' => 'array',
        'raw_payload' => 'array',
        'synced_at' => 'datetime',
    ];

    public function adSet()
    {
        return $this->belongsTo(MetaAdSet::class, 'meta_ad_set_id');
    }
}
