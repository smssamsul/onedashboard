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
        'tanggal_mulai',
        'tenggat',
        'tanggal_selesai',
    ];

    /**
     * tanggal_mulai & tenggat sengaja diserialisasi sebagai 'Y-m-d' polos.
     * Tanpa format eksplisit, cast 'date' dikirim sebagai ISO UTC — di zona
     * Asia/Jakarta itu jadi pukul 17.00 hari sebelumnya, dan klien yang
     * membaca 10 karakter pertama akan meleset satu hari di timeline.
     */
    protected $casts = [
        'tanggal_mulai' => 'date:Y-m-d',
        'tenggat' => 'date:Y-m-d',
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
