<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProdukBundling extends Model
{
    use HasFactory;

    protected $table = 'produk_bundling';

    protected $fillable = [
        'produk',
        'nama',
        'harga',
        'status',
    ];

    public $timestamps = false;

    /**
     * Relasi ke Produk
     */
    public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk', 'id');
    }
}
