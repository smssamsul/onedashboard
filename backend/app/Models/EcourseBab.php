<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EcourseBab extends Model
{
    use HasFactory;

    protected $table = 'ecourse_bab';

    protected $fillable = [
        'produk_id',
        'judul',
        'overview',
        'urutan',
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id', 'id');
    }

    public function ecourses()
    {
        return $this->hasMany(Ecourse::class, 'ecourse_bab_id', 'id')->orderBy('urutan');
    }
}
