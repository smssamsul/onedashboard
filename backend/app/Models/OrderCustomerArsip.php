<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderCustomerArsip extends Model
{
    protected $table = 'order_customer_arsip';

    protected $fillable = [
        'customer_id',
        'produk_id',
        'produk_nama_manual',
        'harga',
        'status_pembayaran',
        'status_order',
        'tanggal',
        'sumber',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
