<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrShift extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_shift';

    protected $fillable = [
        'nama',
        'start_time',
        'end_time',
        'is_flexible',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    protected $casts = [
        'is_flexible' => 'boolean',
        'start_time' => 'string',
        'end_time' => 'string',
    ];
}

