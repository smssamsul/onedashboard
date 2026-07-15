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
    ];

    protected $casts = [
        'is_on' => 'boolean',
    ];
}
