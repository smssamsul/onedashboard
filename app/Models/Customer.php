<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable; 
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\HasActivityLog;
use Tymon\JWTAuth\Contracts\JWTSubject;
use App\Models\User;

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
        'sales_id',
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

    /**
     * Relasi ke OrderCustomer
     */
    public function orders()
    {
        return $this->hasMany(OrderCustomer::class, 'customer', 'id')
            ->where('status', '!=', 'N')
            ->orderBy('create_at', 'desc');
    }

    /**
     * Relasi ke Sales/User melalui sales_id
     */
    public function sales_rel()
    {
        return $this->belongsTo(User::class, 'sales_id', 'id');
    }

}