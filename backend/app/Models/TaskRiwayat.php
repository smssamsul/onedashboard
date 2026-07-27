<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskRiwayat extends Model
{
    protected $table = 'task_riwayat';
    public $timestamps = false;

    protected $fillable = [
        'task_id',
        'hr_karyawan_id',
        'aksi',
        'keterangan',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id', 'id');
    }

    public function pelaku()
    {
        return $this->belongsTo(HrKaryawan::class, 'hr_karyawan_id', 'id');
    }
}
