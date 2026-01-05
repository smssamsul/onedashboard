<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable; 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasActivityLog;
use Tymon\JWTAuth\Contracts\JWTSubject;

class Customer extends Authenticatable implements JWTSubject
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
        'memberID',
        'keanggotaan',
        'provinsi',
        'kabupaten',
        'kecamatan',
        'sapaan',
        'kode_pos',
        'status'
    ];

    protected $hidden = [
        'password',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [];
    }

}