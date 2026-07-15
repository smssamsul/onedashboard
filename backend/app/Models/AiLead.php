<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiLead extends Model
{
    use HasFactory;

    protected $table = 'ai_leads';

    protected $fillable = [
        'name',
        'phone_number',
        'first_message',
        'source',
        'assigned_sales_id',
        'assigned_at',
        'status',
        'lead_score',
        'last_reply_at',
        'followup_at',
        'product',
        'location',
        // Legacy fields untuk kompatibilitas
        'customer_id',
        'sales_id',
        'lead_label',
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
        'assigned_at' => 'datetime',
        'last_reply_at' => 'datetime',
        'followup_at' => 'datetime',
        'create_at' => 'datetime',
        'update_at' => 'datetime',
        'last_contact_at' => 'datetime',
        'next_follow_up_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function sales()
    {
        return $this->belongsTo(User::class, 'assigned_sales_id', 'id');
    }

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function sales_rel()
    {
        return $this->belongsTo(User::class, 'sales_id', 'id');
    }

    public function percakapan()
    {
        return $this->hasMany(Percakapan::class, 'ai_leads_id', 'id');
    }
}
