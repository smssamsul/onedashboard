<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\KnowledgeChunk;

class VectorSearchService
{
    public function search(string $question, ?int $productId = null, int $limit = 3): array
    {
        try {
            $vector = app(\App\Services\VoyageEmbeddingService::class)->embed($question);
            $vectorString = '[' . implode(',', $vector) . ']';

            Log::info('VectorSearchService: Searching', [
                'question' => $question,
                'product_id' => $productId,
            ]);

            // Build query with cosine similarity (1 - cosine_distance)
            // Note: <=> is cosine distance operator in pgvector
            // Using parameter binding for vector to prevent SQL injection
            $query = DB::table('knowledge_chunks')
                ->select('id', 'content', 'source_id', 'product_id', 'metadata')
                ->selectRaw("1 - (embedding <=> ?::vector) as similarity", [$vectorString])
                ->whereNotNull('embedding')
                ->orderByRaw('embedding <=> ?::vector', [$vectorString]);

            // Filter logic:
            // - If productId provided: search in product knowledge (product_id = X) OR master knowledge (product_id IS NULL)
            // - If productId null: search only in master knowledge (product_id IS NULL)
            if ($productId !== null) {
                $query->where(function($q) use ($productId) {
                    $q->where('product_id', $productId)
                      ->orWhereNull('product_id'); // Include master knowledge
                });
            } else {
                // Only master knowledge when no productId
                $query->whereNull('product_id');
            }

            $results = $query->limit($limit)->get();

            Log::info('VectorSearchService: Results', [
                'count' => $results->count(),
                'product_id' => $productId,
            ]);

            return $results
                ->pluck('content')
                ->filter()
                ->toArray();
        } catch (\Exception $e) {
            Log::error('VectorSearchService: Error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return [];
        }
    }

    public function searchWithDetails(string $question, ?int $productId = null, int $limit = 3): array
    {
        try {
            $vector = app(\App\Services\VoyageEmbeddingService::class)->embed($question);
            $vectorString = '[' . implode(',', $vector) . ']';

            $query = DB::table('knowledge_chunks')
                ->select('id', 'content', 'source_id', 'product_id', 'metadata')
                ->selectRaw("1 - (embedding <=> ?::vector) as similarity", [$vectorString])
                ->whereNotNull('embedding')
                ->orderByRaw('embedding <=> ?::vector', [$vectorString]);

            // Filter logic: same as search() method
            if ($productId !== null) {
                $query->where(function($q) use ($productId) {
                    $q->where('product_id', $productId)
                      ->orWhereNull('product_id'); // Include master knowledge
                });
            } else {
                // Only master knowledge when no productId
                $query->whereNull('product_id');
            }

            return $query->limit($limit)->get()->toArray();
        } catch (\Exception $e) {
            Log::error('VectorSearchService: Error', [
                'message' => $e->getMessage(),
            ]);
            return [];
        }
    }
}
