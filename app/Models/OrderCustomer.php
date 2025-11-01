<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class OrderCustomer extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'order_customer';

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
    ];

    public $timestamps = false;
}