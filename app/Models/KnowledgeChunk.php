<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnowledgeChunk extends Model
{
    protected $table = 'knowledge_chunks';

    protected $fillable = [
        'source_id',
        'product_id',
        'content',
        'metadata',
    ];

    // embedding tidak di-fillable karena menggunakan raw SQL

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function source()
    {
        return $this->belongsTo(KnowledgeSource::class, 'source_id');
    }

    public function product()
    {
        return $this->belongsTo(Produk::class, 'product_id');
    }
}
