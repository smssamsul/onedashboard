<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KnowledgeSource extends Model
{
    protected $table = 'knowledge_sources';

    protected $fillable = [
        'type',
        'product_id',
        'title',
        'content',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function chunks()
    {
        return $this->hasMany(KnowledgeChunk::class, 'source_id');
    }

    public function product()
    {
        return $this->belongsTo(Produk::class, 'product_id');
    }
}
