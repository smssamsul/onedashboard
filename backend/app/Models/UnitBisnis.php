<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnitBisnis extends Model
{
    protected $table = 'unit_bisnis';

    protected $fillable = ['nama', 'slug', 'create_at', 'update_at', 'status'];

    public $timestamps = false;

    public function produk()
    {
        return $this->hasMany(Produk::class, 'unit_bisnis', 'id');
    }
}
