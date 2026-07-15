<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrTypeCuti extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_type_cuti';

    protected $fillable = [
        'nama',
        'kuota',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;
}

