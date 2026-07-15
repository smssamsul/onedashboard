<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrDepartemen extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_departemen';

    protected $fillable = [
        'nama',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    /**
     * Relasi ke HrKaryawan
     */
    public function karyawan()
    {
        return $this->hasMany(HrKaryawan::class, 'departemen', 'id');
    }
}

