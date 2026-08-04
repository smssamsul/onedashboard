<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    protected $table = 'ai_usage_logs';

    const UPDATED_AT = null;

    protected $fillable = [
        'fitur',
        'model',
        'input_tokens',
        'output_tokens',
        'cache_creation_tokens',
        'cache_read_tokens',
        'estimasi_biaya_usd',
        'sukses',
    ];

    protected $casts = [
        'sukses' => 'boolean',
        'estimasi_biaya_usd' => 'float',
    ];
}
