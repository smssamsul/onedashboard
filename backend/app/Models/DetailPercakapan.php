<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DetailPercakapan extends Model
{
    protected $table = 'detail_percakapan';
    
    public $timestamps = false;
    
    protected $fillable = [
        'id_percakapan',
        'sender_type',
        'message_text',
        'message_type',
        'intent',
        'tags',
        'created_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'created_at' => 'datetime',
    ];

    public function percakapan()
    {
        return $this->belongsTo(Percakapan::class, 'id_percakapan', 'id');
    }
}
