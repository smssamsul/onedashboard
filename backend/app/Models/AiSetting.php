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
        'business_unit_id',
    ];

    protected $casts = [
        'is_on' => 'boolean',
    ];

    /**
     * Relasi ke UnitBisnis (tenant)
     */
    public function businessUnit()
    {
        return $this->belongsTo(UnitBisnis::class, 'business_unit_id', 'id');
    }
}
