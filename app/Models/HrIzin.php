<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrIzin extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_izin';

    protected $fillable = [
        'karyawan',
        'jenis_izin',
        'tanggal',
        'tanggal_mulai',
        'tanggal_akhir',
        'jam_mulai',
        'alasan',
        'status_izin',
        'approved_by',
        'catatan_approval',
        'approved_at',
        'approval_direksi',
        'status_approval_direksi',
        'catatan_approval_direksi',
        'approved_direksi_at',
        'status',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    protected $casts = [
        'tanggal' => 'date',
        'tanggal_mulai' => 'date',
        'tanggal_akhir' => 'date',
        'approved_at' => 'datetime',
        'approved_direksi_at' => 'datetime',
    ];

    /**
     * Relasi ke HrKaryawan (pemohon)
     */
    public function karyawan_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'karyawan', 'id');
    }

    /**
     * Relasi ke HrKaryawan (approver atasan)
     */
    public function approved_by_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'approved_by', 'id');
    }

    /**
     * Relasi ke HrKaryawan (approver direksi)
     */
    public function approval_direksi_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'approval_direksi', 'id');
    }
}
