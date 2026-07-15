<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PixelCheckLog extends Model
{
    protected $table = 'pixel_check_logs';

    public $timestamps = false;

    protected $casts = [
        'payload' => 'array',
        'create_at' => 'datetime',
        'update_at' => 'datetime',
    ];

    protected $fillable = [
        'order_id',
        'produk_id',
        'pixel_id',
        'event_name',
        'source',
        'status',
        'payload',
        'ip_address',
        'user_agent',
        'create_at',
        'update_at',
    ];

    public function order()
    {
        return $this->belongsTo(OrderCustomer::class, 'order_id');
    }

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }
}
