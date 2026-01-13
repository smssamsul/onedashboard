<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class OrderCustomer extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'order_customer';

      protected $casts = [
        'create_at' => 'datetime',
        'bundling' => 'integer', // Foreign key ke produk_bundling
    ];

    protected $fillable = [
        'customer',
        'produk',
        'tanggal',
        'harga',
        'ongkir',
        'total_harga',
        'alamat',
        'sumber',
        'waktu_pembayaran',
        'bukti_pembayaran',
        'metode_bayar',
        'create_at',
        'update_at',
        'status',
        'status_pembayaran',
        'status_order',
        'custom_value',
        'catatan',
        'bundling',
    ];

    public $timestamps = false;

     public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk', 'id');
    }

    
     public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }

    public function order_payment_rel()
    {
        return $this->hasMany(OrderPayment::class, 'order_id', 'id');
    }

    /**
     * Relasi ke ProdukBundling
     */
    public function bundling_rel()
    {
        return $this->belongsTo(ProdukBundling::class, 'bundling', 'id');
    }
}