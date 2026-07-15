<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\KnowledgeChunk;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class VoyageEmbeddingService
{
    public function embed(string $text): array
    {
        $response = Http::withHeaders([
            'Authorization' => "Bearer " . env('VOYAGE_API_KEY'),
            'Content-Type' => 'application/json'
        ])->post('https://api.voyageai.com/v1/embeddings', [
            'input' => [$text],
            'model' => 'voyage-3'
        ]);

        if ($response->failed()) {
            Log::channel('ai')->error('VoyageEmbeddingService: API Request failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            throw new \Exception('Voyage API request failed: ' . $response->body());
        }

        $embedding = $response->json('data.0.embedding');
        
        if (empty($embedding)) {
            Log::channel('ai')->error('VoyageEmbeddingService: No embedding in response', [
                'response' => $response->json()
            ]);
            throw new \Exception('No embedding found in Voyage API response');
        }

        return $embedding;
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

        Log::channel('ai')->info('VoyageEmbeddingService: Stored chunk', [
            'chunk_id' => $chunk->id,
            'source_id' => $sourceId,
        ]);

        return $chunk;
    }
}
