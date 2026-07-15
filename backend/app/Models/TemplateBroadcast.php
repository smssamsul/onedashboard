<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TemplateBroadcast extends Model
{
    use HasFactory;

    protected $table = 'template_broadcast';

    protected $fillable = [
        'sales_id',
        'judul',
        'isi',
        'status',
        'create_at',
        'update_at',
    ];

    public $timestamps = false;

    /** Template yang masih dipakai (bukan arsip N / nonaktif 0). */
    public function scopeActive($query)
    {
        return $query->whereNotIn('status', ['N', '0']);
    }
}
