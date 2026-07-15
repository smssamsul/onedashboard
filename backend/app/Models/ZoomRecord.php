<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ZoomRecord extends Model
{
    use HasFactory;

    protected $table = 'zoom_record';

    protected $fillable = [
        'link',
        'id_produk',
    ];

    const CREATED_AT = 'create_at';
    const UPDATED_AT = 'update_at';

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'id_produk', 'id');
    }
}

