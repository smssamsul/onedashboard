<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class AktivitasLead extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'aktivitas_lead';

    protected $fillable = [
        'lead_id',
        'customer_id',
        'user_id',
        'type',
        'note',
        'create_at',
    ];

    protected $casts = [
        'create_at' => 'datetime',
    ];

    public $timestamps = false;

    public function lead_rel()
    {
        return $this->belongsTo(Lead::class, 'lead_id', 'id');
    }

    public function customer_rel()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function user_rel()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}

