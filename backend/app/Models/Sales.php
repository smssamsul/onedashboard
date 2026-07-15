<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Sales extends Model
{
    use HasFactory;

    protected $table = 'sales';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'woowa_key',
        'no_wa',
        'baileys_session_id',
        'urutan',
        'last_update_lead',
        'create_at',
        'update_at'
    ];

    /**
     * Relasi ke User
     */
    public function user_rel()
    {
        return $this->belongsTo(\App\Models\User::class, 'user_id', 'id');
    }

    /**
     * Relasi ke HrKaryawan
     */
    public function karyawan_rel()
    {
        return $this->hasOne(\App\Models\HrKaryawan::class, 'user_id', 'user_id');
    }
}

