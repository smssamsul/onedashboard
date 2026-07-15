<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\KnowledgeSource;
use App\Models\KnowledgeChunk;
use App\Services\VoyageEmbeddingService;
use App\Services\KnowledgeChunkingService;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KnowledgeSourceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = KnowledgeSource::query();

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by product_id
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'ILIKE', "%{$search}%")
                  ->orWhere('content', 'ILIKE', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 15);
        $sources = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $sources->items(),
            'pagination' => [
                'current_page' => $sources->currentPage(),
                'last_page' => $sources->lastPage(),
                'per_page' => $sources->perPage(),
                'total' => $sources->total(),
            ]
        ]);
    }

    public function show($id)
    {
        $source = KnowledgeSource::find($id);

        if (!$source) {
            return response()->json([
                'success' => false,
                'message' => 'Knowledge source tidak ditemukan'
            ], 404);
        }

        // Add embedding info for each chunk
        $chunks = $source->chunks->map(function ($chunk) {
            $hasEmbedding = DB::table('knowledge_chunks')
                ->where('id', $chunk->id)
                ->whereNotNull('embedding')
                ->exists();
            
            return [
                'id' => $chunk->id,
                'source_id' => $chunk->source_id,
                'product_id' => $chunk->product_id,
                'content' => $chunk->content,
                'metadata' => $chunk->metadata,
                'has_embedding' => $hasEmbedding,
                'created_at' => $chunk->created_at,
            ];
        });

        $sourceData = $source->toArray();
        $sourceData['chunks'] = $chunks;

        return response()->json([
            'success' => true,
            'data' => $sourceData
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'type' => 'required|string|in:master,product',
            'product_id' => 'nullable|integer|exists:produk,id',
            'title' => 'required|string|max:500',
            'content' => 'required|string',
            'auto_chunk' => 'nullable|boolean',
            'chunk_size' => 'nullable|integer|min:100|max:2000',
            'chunk_overlap' => 'nullable|integer|min:0|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Validate product_id required if type is product
        if ($request->type === 'product' && !$request->product_id) {
            return response()->json([
                'success' => false,
                'message' => 'product_id wajib diisi untuk type product'
            ], 422);
        }

        DB::beginTransaction();
        try {
            $source = KnowledgeSource::create([
                'type' => $request->type,
                'product_id' => $request->product_id,
                'title' => $request->title,
                'content' => $request->content,
            ]);

            // Auto chunk and generate embeddings if requested
            if ($request->boolean('auto_chunk', true)) {
                $this->processChunks($source, $request->chunk_size ?? 500, $request->chunk_overlap ?? 50);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Knowledge source berhasil dibuat',
                'data' => $source->load('chunks')
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('ai')->error('KnowledgeSourceController: Store error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat knowledge source: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $source = KnowledgeSource::find($id);

        if (!$source) {
            return response()->json([
                'success' => false,
                'message' => 'Knowledge source tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'sometimes|string|in:master,product',
            'product_id' => 'nullable|integer|exists:produk,id',
            'title' => 'sometimes|string|max:500',
            'content' => 'sometimes|string',
            'regenerate_embeddings' => 'nullable|boolean',
            'chunk_size' => 'nullable|integer|min:100|max:2000',
            'chunk_overlap' => 'nullable|integer|min:0|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $source->update($request->only(['type', 'product_id', 'title', 'content']));

            // Regenerate embeddings if requested
            if ($request->boolean('regenerate_embeddings', false)) {
                // Delete old chunks
                KnowledgeChunk::where('source_id', $source->id)->delete();
                
                // Process new chunks
                $this->processChunks(
                    $source, 
                    $request->chunk_size ?? 500, 
                    $request->chunk_overlap ?? 50
                );
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Knowledge source berhasil diupdate',
                'data' => $source->load('chunks')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('ai')->error('KnowledgeSourceController: Update error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate knowledge source: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        $source = KnowledgeSource::find($id);

        if (!$source) {
            return response()->json([
                'success' => false,
                'message' => 'Knowledge source tidak ditemukan'
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Delete chunks first
            KnowledgeChunk::where('source_id', $source->id)->delete();
            
            // Delete source
            $source->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Knowledge source berhasil dihapus'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('ai')->error('KnowledgeSourceController: Delete error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus knowledge source: ' . $e->getMessage()
            ], 500);
        }
    }

    public function processChunks(KnowledgeSource $source, int $chunkSize = 500, int $overlap = 50)
    {
        $chunkingService = app(KnowledgeChunkingService::class);
        $embeddingService = app(VoyageEmbeddingService::class);

        $chunks = $chunkingService->chunkText($source->content, $chunkSize, $overlap);

        Log::channel('ai')->info('KnowledgeSourceController: Processing chunks', [
            'source_id' => $source->id,
            'chunks_count' => count($chunks),
        ]);

        foreach ($chunks as $index => $chunkContent) {
            try {
                $embeddingService->store(
                    content: $chunkContent,
                    sourceId: $source->id,
                    productId: $source->product_id,
                    metadata: [
                        'chunk_index' => $index,
                        'source_title' => $source->title,
                        'source_type' => $source->type,
                    ]
                );
            } catch (\Exception $e) {
                Log::channel('ai')->error('KnowledgeSourceController: Failed to store chunk', [
                    'source_id' => $source->id,
                    'chunk_index' => $index,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return count($chunks);
    }

    public function checkEmbedding($id)
    {
        $chunk = KnowledgeChunk::find($id);

        if (!$chunk) {
            return response()->json([
                'success' => false,
                'message' => 'Chunk tidak ditemukan'
            ], 404);
        }

        // Check if embedding exists
        $hasEmbedding = DB::table('knowledge_chunks')
            ->where('id', $id)
            ->whereNotNull('embedding')
            ->exists();

        if (!$hasEmbedding) {
            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $chunk->id,
                    'has_embedding' => false,
                    'message' => 'Chunk ini belum memiliki embedding'
                ]
            ]);
        }

        // Get embedding vector (first 10 values as preview)
        $embeddingPreview = DB::selectOne("
            SELECT 
                id,
                LEFT(content, 100) as content_preview,
                (
                    SELECT array_agg(val::numeric)
                    FROM unnest(string_to_array(embedding::text, ',')) WITH ORDINALITY AS t(val, idx)
                    WHERE idx <= 10
                ) as first_10_values,
                array_length(string_to_array(embedding::text, ','), 1) as dimensions
            FROM knowledge_chunks 
            WHERE id = ?
        ", [$id]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $chunk->id,
                'source_id' => $chunk->source_id,
                'content_preview' => $embeddingPreview->content_preview ?? substr($chunk->content, 0, 100),
                'has_embedding' => true,
                'dimensions' => $embeddingPreview->dimensions ?? null,
                'first_10_values' => $embeddingPreview->first_10_values ?? null,
            ]
        ]);
    }

    public function regenerateEmbeddings($id)
    {
        $source = KnowledgeSource::find($id);

        if (!$source) {
            return response()->json([
                'success' => false,
                'message' => 'Knowledge source tidak ditemukan'
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Delete old chunks
            KnowledgeChunk::where('source_id', $source->id)->delete();
            
            // Process new chunks
            $chunksCount = $this->processChunks($source);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Embeddings berhasil di-regenerate. {$chunksCount} chunks dibuat.",
                'data' => [
                    'chunks_count' => $chunksCount,
                    'source' => $source->load('chunks')
                ]
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('ai')->error('KnowledgeSourceController: Regenerate embeddings error', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal regenerate embeddings: ' . $e->getMessage()
            ], 500);
        }
    }
}
