<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class BroadcastPenerima extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'broadcast_penerima';

    protected $fillable = [
        'broadcast',
        'user',
        'customer',
        'notelp',
        'pesan',
        'response',
        'status',
        'send_at',
    ];

    public $timestamps = false;

    /**
     * Relasi ke Broadcast
     */
    public function broadcast_rel()
    {
        return $this->belongsTo(Broadcast::class, 'broadcast', 'id');
    }

    /**
     * Relasi ke User
     */
    public function user_rel()
    {
        return $this->belongsTo(User::class, 'user', 'id');
    }

    /**
     * Relasi ke Customer
     */
    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer', 'id');
    }
}

