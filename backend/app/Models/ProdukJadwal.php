<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProdukJadwal extends Model
{
    use HasFactory;

    protected $table = 'produk_jadwal';

    protected $fillable = [
        'produk_id',
        'nama_jadwal',
        'waktu_mulai',
        'waktu_selesai',
        'kuota',
        'status',
    ];

    protected $casts = [
        'waktu_mulai' => 'datetime',
        'waktu_selesai' => 'datetime',
        'kuota' => 'integer',
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id', 'id');
    }

    public function orders()
    {
        return $this->hasMany(OrderCustomer::class, 'jadwal_id', 'id');
    }
}
