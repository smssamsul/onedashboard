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
        'landingpage',
        'create_at',
        'update_at',
        'status',
        'assign',
        'custom_field',
        'list_point',
        'testimoni',
        'fb_pixel',
        'event_fb_pixel',
        'gtm',
        'video',
        
    ];

    public $timestamps = false;

    // Supaya kolom 'gambar' otomatis dikonversi ke array saat diakses
    protected $casts = [
        'gambar'    => 'array',
        'assign' => 'array',
        'custom_field' => 'array',
        'list_point' => 'array',
        'testimoni' => 'array',
        'fb_pixel' => 'array',
        'event_fb_pixel' => 'array',
        'gtm' => 'array',
        'video' => 'array',
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