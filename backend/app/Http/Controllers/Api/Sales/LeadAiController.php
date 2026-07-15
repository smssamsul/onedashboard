<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiLead;
use App\Models\Percakapan;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LeadAiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get list of AI leads
     */
    public function index(Request $request)
    {
        $query = AiLead::query();

        // Filter by status
        if ($request->has('status') && $request->status && $request->status !== 'all') {
            $query->whereRaw('LOWER(status) = ?', [strtolower($request->status)]);
        }

        // Filter by assigned sales
        if ($request->has('assigned_sales_id') && $request->assigned_sales_id) {
            $query->where('assigned_sales_id', $request->assigned_sales_id);
        }

        // Search by name, phone_number, or first_message
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('phone_number', 'like', '%' . $search . '%')
                  ->orWhere('first_message', 'like', '%' . $search . '%');
            });
        }

        // Filter by name (specific)
        if ($request->has('name') && $request->name) {
            $query->where('name', 'like', '%' . $request->name . '%');
        }

        // Filter by phone_number (specific)
        if ($request->has('phone_number') && $request->phone_number) {
            $query->where('phone_number', 'like', '%' . $request->phone_number . '%');
        }

        // Filter by product
        if ($request->has('product') && $request->product) {
            $query->where('product', 'like', '%' . $request->product . '%');
        }

        // Filter by location
        if ($request->has('location') && $request->location) {
            $query->where('location', 'like', '%' . $request->location . '%');
        }

        // Filter by date range (created_at)
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $query->orderBy('last_reply_at', 'desc')
              ->orderBy('created_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $leads = $query->paginate($perPage);

        // Transform data untuk response
        $transformedLeads = $leads->map(function($lead) {
            return [
                'id' => $lead->id,
                'name' => $lead->name,
                'phone_number' => $lead->phone_number,
                'first_message' => $lead->first_message,
                'status' => $lead->status,
                'product' => $lead->product,
                'location' => $lead->location,
                'source' => $lead->source,
                'lead_score' => $lead->lead_score,
                'last_reply_at' => $lead->last_reply_at,
                'followup_at' => $lead->followup_at,
                'assigned_at' => $lead->assigned_at,
                'created_at' => $lead->created_at,
                'updated_at' => $lead->updated_at,
                'last_contact_at' => $lead->last_contact_at,
                'next_follow_up_at' => $lead->next_follow_up_at,
                'lead_label' => $lead->lead_label,
                'minat_produk' => $lead->minat_produk,
                'alasan_tertarik' => $lead->alasan_tertarik,
                'alasan_belum' => $lead->alasan_belum,
                'harapan' => $lead->harapan,
                'assigned_sales' => $lead->sales ? [
                    'id' => $lead->sales->id,
                    'nama' => $lead->sales->nama,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Data AI leads berhasil diambil',
            'data' => $transformedLeads,
            'pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
        ]);
    }

    /**
     * Get single AI lead
     */
    public function show($id)
    {
        $lead = AiLead::with('sales:id,nama,level')->find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'AI Lead tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data AI lead berhasil diambil',
            'data' => [
                'id' => $lead->id,
                'name' => $lead->name,
                'phone_number' => $lead->phone_number,
                'first_message' => $lead->first_message,
                'status' => $lead->status,
                'product' => $lead->product,
                'location' => $lead->location,
                'source' => $lead->source,
                'lead_score' => $lead->lead_score,
                'last_reply_at' => $lead->last_reply_at,
                'followup_at' => $lead->followup_at,
                'assigned_at' => $lead->assigned_at,
                'created_at' => $lead->created_at,
                'updated_at' => $lead->updated_at,
                'last_contact_at' => $lead->last_contact_at,
                'next_follow_up_at' => $lead->next_follow_up_at,
                'lead_label' => $lead->lead_label,
                'minat_produk' => $lead->minat_produk,
                'alasan_tertarik' => $lead->alasan_tertarik,
                'alasan_belum' => $lead->alasan_belum,
                'harapan' => $lead->harapan,
                'assigned_sales' => $lead->sales ? [
                    'id' => $lead->sales->id,
                    'nama' => $lead->sales->nama,
                    'level' => $lead->sales->level,
                ] : null,
            ]
        ]);
    }

    /**
     * Update AI lead
     */
    public function update(Request $request, $id)
    {
        $lead = AiLead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'AI Lead tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'phone_number' => 'sometimes|string|max:255',
            'first_message' => 'nullable|string',
            'status' => 'sometimes|string|in:new,hot,warm,cold,trash',
            'product' => 'nullable|string|max:255',
            'location' => 'nullable|string|max:255',
            'source' => 'nullable|string|max:255',
            'lead_score' => 'nullable|integer|min:0|max:100',
            'assigned_sales_id' => 'nullable|integer|exists:user,id',
            'followup_at' => 'nullable|date',
            'assigned_at' => 'nullable|date',
            'last_reply_at' => 'nullable|date',
            'last_contact_at' => 'nullable|date',
            'next_follow_up_at' => 'nullable|date',
            'lead_label' => 'nullable|string|max:255',
            'minat_produk' => 'nullable|string|max:255',
            'alasan_tertarik' => 'nullable|string',
            'alasan_belum' => 'nullable|string',
            'harapan' => 'nullable|string',
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
            $updateData = $validator->validated();
            
            // Handle date fields
            $dateFields = ['followup_at', 'assigned_at', 'last_reply_at', 'last_contact_at', 'next_follow_up_at'];
            foreach ($dateFields as $field) {
                if (isset($updateData[$field]) && $updateData[$field] === '') {
                    $updateData[$field] = null;
                }
            }
            
            $lead->update($updateData);

            // Jika status diubah, update juga status di semua percakapan terkait
            if ($request->has('status')) {
                Percakapan::where('ai_leads_id', $lead->id)
                    ->update(['status' => $request->status]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'AI Lead berhasil diupdate',
                'data' => $lead->fresh()
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating AI Lead', [
                'lead_id' => $id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate AI Lead: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete AI lead
     */
    public function destroy($id)
    {
        $lead = AiLead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'AI Lead tidak ditemukan'
            ], 404);
        }

        $lead->delete();

        return response()->json([
            'success' => true,
            'message' => 'AI Lead berhasil dihapus'
        ]);
    }

    /**
     * Get statistics
     */
    public function statistics()
    {
        $totalLeads = AiLead::count();
        $newLeads = AiLead::whereRaw('LOWER(status) = ?', ['new'])->count();
        $contactedLeads = AiLead::whereRaw('LOWER(status) = ?', ['contacted'])->count();
        $qualifiedLeads = AiLead::whereRaw('LOWER(status) = ?', ['qualified'])->count();
        $convertedLeads = AiLead::whereRaw('LOWER(status) = ?', ['converted'])->count();
        $lostLeads = AiLead::whereRaw('LOWER(status) = ?', ['lost'])->count();
        $activeLeads = AiLead::whereRaw('LOWER(status) NOT IN (?, ?)', ['converted', 'lost'])
            ->whereRaw('LOWER(status) != ?', ['n'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_leads' => $totalLeads,
                'new_leads' => $newLeads,
                'contacted_leads' => $contactedLeads,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'lost_leads' => $lostLeads,
                'active_leads' => $activeLeads,
            ]
        ]);
    }
}
