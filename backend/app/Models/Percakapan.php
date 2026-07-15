<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Percakapan extends Model
{
    protected $table = 'percakapan';
    
    protected $fillable = [
        'ai_leads_id',
        'phone_number',
        'assigned_sales_id',
        'status',
        'lead_score',
        'tags',
        'source',
        'last_message_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'last_message_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function detailPercakapan()
    {
        return $this->hasMany(DetailPercakapan::class, 'id_percakapan', 'id')->orderBy('created_at', 'asc');
    }

    public function lead()
    {
        return $this->belongsTo(AiLead::class, 'ai_leads_id', 'id');
    }

    public function sales()
    {
        return $this->belongsTo(User::class, 'assigned_sales_id', 'id');
    }
}
