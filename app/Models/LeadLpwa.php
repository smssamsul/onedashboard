<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeadLpwa extends Model
{
    protected $table = 'lead_lpwas';

    protected $fillable = [
        'nama',
        'no_wa',
        'produk_id',
        'sales_id',
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }

    public function sales()
    {
        return $this->belongsTo(User::class, 'sales_id');
    }
}
