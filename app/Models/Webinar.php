<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Webinar extends Model
{
    use HasFactory;

    protected $table = 'webinar'; 

    protected $fillable = [
        'produk_id',
        'meeting_id',
        'join_url',
        'start_url',
        'password',
        'start_time',
        'duration',
    ];

    const CREATED_AT = 'create_at';
    const UPDATED_AT = 'update_at';

    public function produk()
    {
        return $this->belongsTo(Produk::class);
    }
}
