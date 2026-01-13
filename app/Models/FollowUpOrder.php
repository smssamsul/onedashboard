<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class FollowUpOrder extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'follow_up_orders';

    protected $fillable = [
        'order_id',
        'follow_up_date',
        'channel',
        'note',
        'type',
        'status',
        'create_by',
        'create_at',
    ];



    public $timestamps = false;

    public function order_rel()
    {
        return $this->belongsTo(OrderCustomer::class, 'order_id', 'id');
    }

    public function created_by_rel()
    {
        return $this->belongsTo(\App\Models\User::class, 'create_by', 'id');
    }
}

