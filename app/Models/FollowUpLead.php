<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class FollowUpLead extends Model
{
    use HasFactory, HasActivityLog;

    protected $table = 'follow_up_leads';

    protected $fillable = [
        'lead_id',
        'follow_up_date',
        'channel',
        'note',
        'status',
        'create_by',
        'create_at',
    ];

    protected $casts = [
        'follow_up_date' => 'datetime',
        'create_at' => 'datetime',
    ];

    public $timestamps = false;

    public function lead_rel()
    {
        return $this->belongsTo(Lead::class, 'lead_id', 'id');
    }

    public function created_by_rel()
    {
        return $this->belongsTo(User::class, 'create_by', 'id');
    }
}

