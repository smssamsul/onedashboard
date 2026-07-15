<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class OrderPayment extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'order_payments';

    protected $fillable = [
        'order_id',
        'amount',
        'payment_ke',
        'payment_method',
        'payment_type',
        'tanggal',
        'bukti_pembayaran',
        'nama_pengirim',
        'no_rek_pengirim',
        'status',
        'catatan',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'tanggal' => 'date',
    ];

    public $timestamps = false;

    public function order_rel()
    {
        return $this->belongsTo(OrderCustomer::class, 'order_id', 'id');
    }
}

