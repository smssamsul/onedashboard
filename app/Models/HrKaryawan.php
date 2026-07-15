<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrKaryawan extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_karyawan';

    protected $fillable = [
        'user_id',
        'nama',
        'jenis_kelamin',
        'tanggal_lahir',
        'notelp',
        'email',
        'tanggal_join',
        'tanggal_resign',
        'status_karyawan',
        'departemen',
        'jabatan',
        'shift',
        'alamat',
        'avatar_url',
        'kuota_cuti',
        'approval',
        'status',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    protected $casts = [
        'tanggal_lahir' => 'date',
    ];

    /**
     * Relasi ke User
     */
    public function user_rel()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    /**
     * Relasi ke HrDepartemen
     */
    public function departemen_rel()
    {
        return $this->belongsTo(HrDepartemen::class, 'departemen', 'id');
    }

    /**
     * Relasi ke HrShift
     */
    public function shift_rel()
    {
        return $this->belongsTo(HrShift::class, 'shift', 'id');
    }

    /**
     * Relasi ke HrKaryawan (approval direksi)
     */
    public function approval_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'approval', 'id');
    }

}

