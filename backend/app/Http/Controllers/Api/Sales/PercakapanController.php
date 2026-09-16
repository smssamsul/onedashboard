<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Percakapan;
use App\Models\DetailPercakapan;
use App\Models\AiLead;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PercakapanController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get list of conversations
     */
    public function index(Request $request)
    {
        $query = Percakapan::with(['detailPercakapan'])
        ->orderBy('last_message_at', 'desc');

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter by assigned sales
        if ($request->has('assigned_sales_id') && $request->assigned_sales_id) {
            $query->where('assigned_sales_id', $request->assigned_sales_id);
        }

        // Search by nama atau nomor telepon
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('phone_number', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }

        $perPage = $request->get('per_page', 20);
        $conversations = $query->orderBy('last_message_at', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $conversations->items(),
            'pagination' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ]
        ]);
    }

    /**
     * Hitung ulang skor poin (hot/warm/cold/closing/low_quality) satu
     * percakapan on-demand - tombol "Analisa Ulang" di menu Analisa Leads.
     * Dilewati (tidak berubah) kalau status-nya sudah ditandai manual "trash".
     */
    public function rescore($id)
    {
        $percakapan = Percakapan::find($id);
        if (!$percakapan) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan tidak ditemukan'
            ], 404);
        }

        $hasil = app(\App\Services\LeadPointScoringService::class)->rescoreAndSave($percakapan);

        return response()->json([
            'success' => true,
            'message' => $hasil ? "Berhasil dianalisa ulang: {$hasil['label']} (skor {$hasil['score']})" : 'Dilewati (status ditandai manual sebagai trash)',
            'data' => $percakapan->fresh(),
        ]);
    }

    /**
     * Jumlah percakapan per status (untuk badge tab di menu Analisa Leads),
     * dengan scope pencarian yang sama seperti index().
     */
    public function stats(Request $request)
    {
        $query = Percakapan::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('phone_number', 'like', '%' . $search . '%')
                  ->orWhere('name', 'like', '%' . $search . '%');
            });
        }

        $counts = (clone $query)
            ->selectRaw('status, COUNT(*) as jumlah')
            ->groupBy('status')
            ->pluck('jumlah', 'status');

        $labels = ['low_quality', 'cold', 'warm', 'hot', 'closing'];
        $perLabel = [];
        foreach ($labels as $label) {
            $perLabel[$label] = (int) ($counts[$label] ?? 0);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'per_status' => $perLabel,
                'total' => (clone $query)->count(),
            ],
        ]);
    }

    /**
     * Get single conversation with messages
     */
    public function show($id)
    {
        $percakapan = Percakapan::with([
            'detailPercakapan' => function($q) {
                $q->orderBy('created_at', 'asc');
            },
            'sales:id,nama',
        ])
        ->find($id);

        if (!$percakapan) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan tidak ditemukan'
            ], 404);
        }

        // Lengkapi data lead (lokasi, sumber, produk diminati) dari LeadLpwa -
        // dicocokkan by no WA, sama seperti "Sumber Lead" di halaman Orders.
        $lead = \App\Models\LeadLpwa::where('no_wa', $percakapan->phone_number)->first(['lokasi', 'sumber', 'produk_text']);
        $percakapan->lead_lokasi = $lead->lokasi ?? null;
        $percakapan->lead_sumber = $lead->sumber ?? null;
        $percakapan->lead_produk_text = $lead->produk_text ?? null;

        return response()->json([
            'success' => true,
            'data' => $percakapan
        ]);
    }

    /**
     * Create new conversation
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => 'required|string|max:20',
            'ai_leads_id' => 'nullable|integer|exists:ai_leads,id',
            'assigned_sales_id' => 'nullable|integer|exists:user,id',
            'status' => 'required|string|in:new,lead,hot,warm,cold,closing,low_quality,trash',
            'source' => 'nullable|string|max:50',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $percakapan = Percakapan::create([
            'phone_number' => $request->phone_number,
            'ai_leads_id' => $request->ai_leads_id,
            'assigned_sales_id' => $request->assigned_sales_id,
            'status' => $request->status,
            'source' => $request->source ?? 'whatsapp',
            'lead_score' => $request->lead_score ?? 0,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Percakapan berhasil dibuat',
            'data' => $percakapan
        ], 201);
    }

    /**
     * Update conversation
     */
    public function update(Request $request, $id)
    {
        $percakapan = Percakapan::find($id);

        if (!$percakapan) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|string|in:new,lead,hot,warm,cold,closing,low_quality,trash',
            'assigned_sales_id' => 'nullable|integer|exists:user,id',
            'lead_score' => 'nullable|integer',
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
            $percakapan->update($request->only(['status', 'assigned_sales_id', 'lead_score', 'tags']));

            // Jika status diubah, update juga status di ai_leads terkait berdasarkan phone_number atau ai_leads_id
            if ($request->has('status')) {
                $statusToUpdate = $request->status;
                
                // Update leads berdasarkan phone_number
                if ($percakapan->phone_number) {
                    AiLead::where('phone_number', $percakapan->phone_number)
                        ->update(['status' => $statusToUpdate]);
                }
                
                // Update leads berdasarkan ai_leads_id jika ada
                if ($percakapan->ai_leads_id) {
                    AiLead::where('id', $percakapan->ai_leads_id)
                        ->update(['status' => $statusToUpdate]);
                }
                
                Log::info('Status percakapan diupdate dan disinkronkan ke leads', [
                    'percakapan_id' => $id,
                    'phone_number' => $percakapan->phone_number,
                    'ai_leads_id' => $percakapan->ai_leads_id,
                    'status' => $statusToUpdate
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Percakapan berhasil diupdate',
                'data' => $percakapan
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating Percakapan', [
                'percakapan_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate Percakapan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Add message to conversation
     */
    public function addMessage(Request $request, $id)
    {
        $percakapan = Percakapan::find($id);

        if (!$percakapan) {
            return response()->json([
                'success' => false,
                'message' => 'Percakapan tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'sender_type' => 'required|string|in:customer,AI,sales,system',
            'message_text' => 'required|string',
            'message_type' => 'nullable|string|max:20',
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
            // Jika sender_type adalah 'sales', kirim pesan via Woowa
            if ($request->sender_type === 'sales' && $percakapan->phone_number) {
                try {
                    $woowaService = app(\App\Services\WoowaService::class);
                    $woowaService->sendMessage($percakapan->phone_number, $request->message_text);
                    
                    Log::info('Percakapan: Message sent via Woowa', [
                        'percakapan_id' => $id,
                        'phone_number' => $percakapan->phone_number,
                        'message' => $request->message_text,
                    ]);
                } catch (\Exception $e) {
                    Log::error('Percakapan: Failed to send message via Woowa', [
                        'percakapan_id' => $id,
                        'phone_number' => $percakapan->phone_number,
                        'error' => $e->getMessage(),
                    ]);
                    // Continue to save message even if Woowa fails
                }
            }

            $intent = null;
            if ($request->sender_type === 'customer') {
                $activityClassifier = app(\App\Services\LeadActivityClassifierService::class);
                $intent = $activityClassifier->classify($request->message_text);
            }

            $detail = DetailPercakapan::create([
                'id_percakapan' => $id,
                'sender_type' => $request->sender_type,
                'message_text' => $request->message_text,
                'message_type' => $request->message_type ?? 'text',
                'intent' => $intent,
                'tags' => $request->tags,
                'created_at' => now(),
            ]);

            // Update last_message_at
            $percakapan->update([
                'last_message_at' => now()
            ]);

            // Auto-update lead status to "lead" if message count is 2-3
            $messageCount = DetailPercakapan::where('id_percakapan', $id)->count();
            if ($messageCount >= 2 && $messageCount <= 3) {
                $lead = AiLead::where('phone_number', $percakapan->phone_number)->first();
                // Update jika status masih new/NEW atau belum di-set ke lead/hot/warm/cold
                if ($lead) {
                    $currentStatus = strtolower(trim($lead->status ?? ''));
                    if (in_array($currentStatus, ['new', '', null])) {
                        $oldStatus = $lead->status;
                        $lead->update([
                            'status' => 'lead',
                            'updated_at' => now()
                        ]);
                        Log::info('Lead status auto-updated to lead', [
                            'lead_id' => $lead->id,
                            'phone_number' => $percakapan->phone_number,
                            'message_count' => $messageCount,
                            'old_status' => $oldStatus,
                            'new_status' => 'lead'
                        ]);
                    }
                }
            }

            // Skor poin (hot/warm/cold/closing/low_quality) untuk Analisa
            // Leads - cuma perlu dihitung ulang kalau yang baru masuk pesan customer.
            if ($request->sender_type === 'customer') {
                try {
                    app(\App\Services\LeadPointScoringService::class)->rescoreAndSave($percakapan);
                } catch (\Throwable $e) {
                    Log::warning('Percakapan: gagal rescore skor lead', [
                        'percakapan_id' => $id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesan berhasil ditambahkan',
                'data' => $detail
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error adding message', [
                'percakapan_id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal menambahkan pesan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get or create conversation by phone number
     */
    public function getOrCreateByPhone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone_number' => 'required|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $percakapan = Percakapan::where('phone_number', $request->phone_number)->first();

        if (!$percakapan) {
            $percakapan = Percakapan::create([
                'phone_number' => $request->phone_number,
                'status' => '',
                'source' => 'whatsapp',
                'lead_score' => 0,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $percakapan
        ]);
    }
}
