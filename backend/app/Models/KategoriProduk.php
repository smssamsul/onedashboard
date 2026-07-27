<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class KategoriProduk extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'kategori_produk';

    protected $fillable = [
        'nama',
        'create_at',
        'update_at',
        'status',
    ];

    public $timestamps = false;

    public function produk()
    {
        return $this->hasMany(Produk::class, 'kategori', 'id');
    }
}