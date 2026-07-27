<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskPersetujuan extends Model
{
    protected $table = 'task_persetujuan';

    protected $fillable = [
        'task_id',
        'hr_karyawan_id',
        'jenjang',
        'status',
        'catatan',
        'diputuskan_pada',
    ];

    protected $casts = [
        'diputuskan_pada' => 'datetime',
    ];

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id', 'id');
    }

    public function approver()
    {
        return $this->belongsTo(HrKaryawan::class, 'hr_karyawan_id', 'id');
    }
}
