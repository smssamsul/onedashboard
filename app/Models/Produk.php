<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class Produk extends Model
{
    use HasFactory;

    protected $table = 'produk';

    protected $fillable = [
        'kategori',
        'user_input',
        'nama',
        'url',
        'header',
        'harga_coret',
        'harga_asli',
        'deskripsi',
        'tanggal_event',
        'gambar',
        'lainnya',
        'landingpage',
        'create_at',
        'update_at',
        'status',
    ];

    public $timestamps = false;

    // Supaya kolom 'gambar' otomatis dikonversi ke array saat diakses
    protected $casts = [
        'gambar'    => 'array',
        'lainnya'   => 'array'
    ];

     public function kategori_rel()
    {
        return $this->belongsTo(KategoriProduk::class, 'kategori', 'id');
    }

    
     public function user_rel()
    {
        return $this->belongsTo(User::class, 'user_input', 'id');
    }


}