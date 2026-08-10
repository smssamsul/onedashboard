<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EcourseProgress extends Model
{
    use HasFactory;

    protected $table = 'ecourse_progress';

    protected $fillable = [
        'customer_id',
        'ecourse_id',
        'is_completed',
        'completed_at',
    ];

    protected $casts = [
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id', 'id');
    }

    public function ecourse()
    {
        return $this->belongsTo(Ecourse::class, 'ecourse_id', 'id');
    }
}
