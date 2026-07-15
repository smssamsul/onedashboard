<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HrSetting extends Model
{
    use HasFactory;

    protected $table = 'hr_setting';

    protected $fillable = [
        'nama',
        'lat_absen',
        'long_long',
        'radius',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;
}

