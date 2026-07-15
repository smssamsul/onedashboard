<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderResi extends Model
{
    protected $table = 'order_resi';

    protected $fillable = [
        'order_id',
        'biteship_order_id',
        'tracking_id',
        'waybill_id',
        'courier_company',
        'courier_type',
        'delivery_type',
        'scheduled_at',
        'status',
        'meta',
    ];

    const CREATED_AT = 'create_at';
    const UPDATED_AT = 'update_at';

    protected $casts = [
        'scheduled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(OrderCustomer::class, 'order_id', 'id');
    }
}
