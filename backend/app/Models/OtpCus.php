<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OtpCus extends Model
{
    use HasFactory;

    // Nama tabel di database
    protected $table = 'otp_customer';

    // Primary key
    protected $primaryKey = 'id';

    // Non auto timestamp karena kamu pakai create_at dan expires_at manual
    public $timestamps = false;

    // Kolom yang bisa diisi (fillable)
    protected $fillable = [
        'customer',
        'otp',
        'used',
        'percobaan',
        'create_at',
        'expires_at',
        'status',
    ];

    // Relasi ke tabel customer (jika kamu punya tabel 'customers')
    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }

    // Scope untuk OTP yang masih aktif dan belum kadaluarsa
    public function scopeActive($query)
    {
        return $query->where('status', '1')
                     ->where('used', '0')
                     ->where('expires_at', '>', now());
    }

    // Cek apakah OTP masih valid
    public function isValid()
    {
        return $this->status === '1' && 
               $this->used === '0' &&
               $this->expires_at > now();
    }
}