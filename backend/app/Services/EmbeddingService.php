<?php

namespace App\Services;

use OpenAI\Laravel\Facades\OpenAI;
use App\Models\KnowledgeChunk;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    public function embed(string $text): array
    {
        $response = OpenAI::embeddings()->create([
            'model' => 'text-embedding-3-small',
            'input' => $text,
        ]);

        return $response->embeddings[0]->embedding;
    }

    public function store(string $content, int $sourceId, ?int $productId = null, ?array $metadata = null): KnowledgeChunk
    {
        $vector = $this->embed($content);

        // Convert array to PostgreSQL vector format: [1,2,3]
        $vectorString = '[' . implode(',', $vector) . ']';

        // Insert using raw SQL because Laravel doesn't natively support vector type
        $id = DB::table('knowledge_chunks')->insertGetId([
            'source_id' => $sourceId,
            'product_id' => $productId,
            'content' => $content,
            'metadata' => $metadata ? json_encode($metadata) : null,
            'created_at' => now(),
        ]);

        // Update embedding using raw SQL with proper escaping
        DB::statement("UPDATE knowledge_chunks SET embedding = '{$vectorString}'::vector WHERE id = ?", [$id]);

        $chunk = KnowledgeChunk::find($id);

        Log::channel('ai')->info('EmbeddingService: Stored chunk', [
            'chunk_id' => $chunk->id,
            'source_id' => $sourceId,
        ]);

        return $chunk;
    }
}
