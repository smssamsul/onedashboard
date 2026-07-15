<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiSetting;
use App\Services\VectorSearchService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AiSimulasiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Simulasi percakapan AI - tidak kirim ke WhatsApp.
     * Mendukung custom_prompt override untuk testing gaya bahasa.
     */
    public function chat(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'message'       => 'required|string|max:2000',
            'lead_status'   => 'nullable|string|in:new,lead,cold,warm',
            'custom_prompt' => 'nullable|string',
            'product_id'    => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $message      = $request->message;
        $leadStatus   = $request->lead_status ?? 'new';
        $productId    = $request->product_id;
        $customPrompt = $request->custom_prompt;

        // Tentukan system prompt yang dipakai
        $promptUsed   = null;
        $promptSource = 'database';

        if (!empty($customPrompt)) {
            $promptUsed   = $customPrompt;
            $promptSource = 'custom';
        } else {
            $aiSetting = AiSetting::first();
            if ($aiSetting) {
                $status = strtolower(trim($leadStatus));
                if ($status === 'cold' && !empty($aiSetting->prompt_cold)) {
                    $promptUsed = $aiSetting->prompt_cold;
                } elseif ($status === 'warm' && !empty($aiSetting->prompt_warm)) {
                    $promptUsed = $aiSetting->prompt_warm;
                } else {
                    $promptUsed = $aiSetting->prompt ?? '';
                }
            }
        }

        // Ambil konteks dari vector search DENGAN detail (source, similarity)
        $knowledgeUsed = [];
        $contextText   = '';
        try {
            $rawChunks = app(VectorSearchService::class)->searchWithDetails($message, $productId);

            // Ambil judul knowledge source untuk tiap chunk
            $sourceIds = array_unique(array_column($rawChunks, 'source_id'));
            $sources   = DB::table('knowledge_sources')
                ->whereIn('id', $sourceIds)
                ->select('id', 'title', 'type', 'product_id')
                ->get()
                ->keyBy('id');

            // Ambil nama produk jika ada
            $productIds = array_unique(array_filter(array_column($rawChunks, 'product_id')));
            $products   = [];
            if (!empty($productIds)) {
                $products = DB::table('produk')
                    ->whereIn('id', $productIds)
                    ->select('id', 'nama')
                    ->get()
                    ->keyBy('id');
            }

            $contextParts = [];
            foreach ($rawChunks as $chunk) {
                $chunkArr    = (array) $chunk;
                $sourceId    = $chunkArr['source_id'] ?? null;
                $source      = $sourceId ? ($sources[$sourceId] ?? null) : null;
                $chunkProdId = $chunkArr['product_id'] ?? null;
                $produk      = $chunkProdId ? ($products[$chunkProdId] ?? null) : null;

                $contextParts[] = $chunkArr['content'] ?? '';

                $knowledgeUsed[] = [
                    'chunk_id'       => $chunkArr['id'] ?? null,
                    'source_id'      => $sourceId,
                    'source_title'   => $source ? $source->title : 'Master Knowledge',
                    'source_type'    => $source ? $source->type : null,
                    'product_name'   => $produk ? $produk->nama : ($chunkProdId ? "Produk #{$chunkProdId}" : null),
                    'similarity'     => isset($chunkArr['similarity']) ? round((float) $chunkArr['similarity'] * 100, 1) : null,
                    'content_preview'=> mb_substr($chunkArr['content'] ?? '', 0, 120) . (mb_strlen($chunkArr['content'] ?? '') > 120 ? '...' : ''),
                ];
            }

            $contextText = implode("\n", $contextParts);
        } catch (\Exception $e) {
            Log::channel('ai')->warning('AiSimulasiController: Vector search failed, continuing without context', [
                'error' => $e->getMessage(),
            ]);
        }

        // Panggil Claude API langsung
        try {
            $response = Http::withHeaders([
                'x-api-key'         => env('ANTHROPIC_API_KEY'),
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'    => 'claude-haiku-4-5-20251001',
                'system'   => $promptUsed ?? '',
                'messages' => [
                    [
                        'role'    => 'user',
                        'content' => "Materi:\n{$contextText}\n\nPertanyaan:\n{$message}\n\nJawab singkat saja.",
                    ],
                ],
                'max_tokens' => 1024,
            ]);

            if ($response->failed()) {
                Log::channel('ai')->error('AiSimulasiController: Claude API Error', [
                    'status' => $response->status(),
                    'body'   => $response->json(),
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Claude API error: ' . ($response->json('error.message') ?? 'Unknown error'),
                ], 500);
            }

            $reply        = $response->json('content.0.text') ?? '';
            $inputTokens  = $response->json('usage.input_tokens') ?? 0;
            $outputTokens = $response->json('usage.output_tokens') ?? 0;

            Log::channel('ai')->info('AiSimulasiController: Simulasi chat', [
                'message'         => $message,
                'lead_status'     => $leadStatus,
                'prompt_source'   => $promptSource,
                'knowledge_count' => count($knowledgeUsed),
                'reply_preview'   => substr($reply, 0, 100),
            ]);

            return response()->json([
                'success'        => true,
                'reply'          => $reply,
                'prompt_source'  => $promptSource,
                'prompt_used'    => substr($promptUsed ?? '', 0, 200) . (strlen($promptUsed ?? '') > 200 ? '...' : ''),
                'knowledge_used' => $knowledgeUsed,
                'tokens'         => [
                    'input'  => $inputTokens,
                    'output' => $outputTokens,
                    'total'  => $inputTokens + $outputTokens,
                ],
            ]);
        } catch (\Exception $e) {
            Log::channel('ai')->error('AiSimulasiController: Exception', [
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simpan prompt dari simulasi ke database (update produksi).
     */
    public function savePrompt(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'prompt'      => 'required|string',
            'lead_status' => 'required|string|in:basic,cold,warm',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors'  => $validator->errors(),
            ], 422);
        }

        $setting = AiSetting::first();
        if (!$setting) {
            $setting = new AiSetting();
        }

        $leadStatus = $request->lead_status;
        $prompt     = $request->prompt;

        if ($leadStatus === 'cold') {
            $setting->prompt_cold = $prompt;
        } elseif ($leadStatus === 'warm') {
            $setting->prompt_warm = $prompt;
        } else {
            $setting->prompt = $prompt;
        }

        $setting->save();

        Log::channel('ai')->info('AiSimulasiController: Prompt saved from simulasi', [
            'lead_status' => $leadStatus,
            'user'        => auth()->id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Prompt berhasil disimpan ke produksi',
            'data'    => $setting,
        ]);
    }
}
