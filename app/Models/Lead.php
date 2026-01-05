<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class Lead extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'leads';

    protected $fillable = [
        'customer_id',
        'sales_id',
        'lead_label',
        'status',
        'minat_produk',
        'alasan_tertarik',
        'alasan_belum',
        'harapan',
        'last_contact_at',
        'next_follow_up_at',
        'create_param',
        'create_at',
        'update_at',
    ];

    protected $casts = [
        'create_at' => 'datetime',
        'update_at' => 'datetime',
        'last_contact_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
    ];

    public $timestamps = false;

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function sales_rel()
    {
        return $this->belongsTo(User::class, 'sales_id', 'id');
    }
}

