<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class Broadcast extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'broadcast';

    protected $casts = [
        'target' => 'array',
        'create_at' => 'datetime',
        'update_at' => 'datetime',
    ];

    protected $fillable = [
        'nama',
        'pesan',
        'tanggal_kirim',
        'target',
        'total_target',
        'status',
        'create_at',
        'update_at',
        'create_by',
        'interval_detik',
        'jeda_setiap_n_pesan',
        'istirahat_detik',
        'max_penerima_per_sesi',
        'jeda_antar_sesi_menit',
    ];

    public $timestamps = false;
}

