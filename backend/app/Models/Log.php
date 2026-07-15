<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Log extends Model
{
    use HasFactory;

    protected $table = 'logs';

    protected $fillable = [
        'user',
        'customer',
        'keterangan',
        'create_at',
        'update_at',
        'status',
    ];

    public $timestamps = false; // karena kamu sudah punya create_at dan update_at sendiri
}