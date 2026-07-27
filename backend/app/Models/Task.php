<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $table = 'task';

    protected $fillable = [
        'hr_karyawan_id',
        'dibuat_oleh',
        'judul',
        'deskripsi',
        'status',
        'persentase_penyelesaian',
        'status_persetujuan',
        'tenggat',
        'tanggal_selesai',
    ];

    protected $casts = [
        'tenggat' => 'date',
        'tanggal_selesai' => 'datetime',
    ];

    public function pemilik()
    {
        return $this->belongsTo(HrKaryawan::class, 'hr_karyawan_id', 'id');
    }

    public function pembuat()
    {
        return $this->belongsTo(HrKaryawan::class, 'dibuat_oleh', 'id');
    }

    public function persetujuan()
    {
        return $this->hasMany(TaskPersetujuan::class, 'task_id', 'id')->orderBy('jenjang');
    }

    public function riwayat()
    {
        return $this->hasMany(TaskRiwayat::class, 'task_id', 'id')->orderBy('created_at');
    }
}
