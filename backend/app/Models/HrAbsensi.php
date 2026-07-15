<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrAbsensi extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_absensi';

    protected $fillable = [
        'karyawan',
        'tanggal',
        'check_in',
        'check_out',
        'shift',
        'status_absensi',
        'check_in_photo',
        'check_out_photo',
        'lat_check_in',
        'long_check_in',
        'lat_check_out',
        'long_check_out',
        'notes',
        'emosi',
        'status',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    protected $casts = [
        // 'tanggal' => 'date', // Dihapus karena field tanggal adalah varchar(10), bukan date
    ];

    /**
     * Relasi ke HrKaryawan
     */
    public function karyawan_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'karyawan', 'id');
    }
}

