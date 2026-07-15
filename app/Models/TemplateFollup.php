<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\HasActivityLog;

class TemplateFollup extends Model
{
    use HasFactory;

    protected $table = 'template_follup';

    protected $fillable = [
        'nama',
        'text',
        'event',
        'create_at',
        'update_at',
        'status',
        'produk_id',
        'type',
    ];

    public $timestamps = false;

    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'N');
    }

    public function produk_rel()
    {
        return $this->belongsTo(Produk::class, 'produk_id', 'id');
    }
}