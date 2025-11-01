<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasActivityLog;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'customer';
    protected $primaryKey = 'id';
    public $timestamps = false;

    protected $fillable = [
        'nama',
        'nama_panggilan',
        'email',
        'instagram',
        'password',
        'wa',
        'profesi',
        'pendapatan_bln',
        'industri_pekerjaan',
        'jenis_kelamin',
        'tanggal_lahir',
        'alamat',
        'status_order',
        'verifikasi',
        'alasan_tertarik',
        'alasan_belum',
        'harapan',
        'create_at',
        'update_at',
        'status'
    ];
}