<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class HrCuti extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'hr_cuti';

    protected $fillable = [
        'karyawan',
        'type_cuti',
        'start_date',
        'end_date',
        'alasan',
        'status_cuti',
        'approved_by',
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
        'start_date' => 'date',
        'end_date' => 'date',
        'approved_direksi_at' => 'datetime',
    ];

    /**
     * Relasi ke HrKaryawan
     */
    public function karyawan_rel()
    {
        return $this->belongsTo(HrKaryawan::class, 'karyawan', 'id');
    }

    /**
     * Relasi ke HrTypeCuti
     */
    public function type_rel()
    {
        return $this->belongsTo(HrTypeCuti::class, 'type_cuti', 'id');
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

