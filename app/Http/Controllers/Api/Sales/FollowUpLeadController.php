<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FollowUpLead;
use App\Models\AktivitasLead;
use App\Models\Lead;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FollowUpLeadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Menampilkan daftar follow up untuk lead tertentu
     */
    public function index(Request $request, $leadId)
    {
        $query = FollowUpLead::where('lead_id', $leadId)
            ->where('status', '!=', 'N')
            ->with(['created_by_rel:id,nama'])
            ->orderBy('follow_up_date', 'desc');

        $perPage = $request->get('per_page', 15);
        $followUps = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data follow up berhasil diambil',
            'data' => $followUps->items(),
            'pagination' => [
                'current_page' => $followUps->currentPage(),
                'last_page' => $followUps->lastPage(),
                'per_page' => $followUps->perPage(),
                'total' => $followUps->total(),
            ],
        ]);
    }

    /**
     * Menampilkan semua follow up (dengan filter)
     */
    public function list(Request $request)
    {
        $query = FollowUpLead::with([
            'lead_rel:id,lead_label,status,customer_id',
            'lead_rel.customer_rel:id,nama,email,wa',
            'created_by_rel:id,nama'
        ])
        ->where('status', '!=', 'N');

        // Filter berdasarkan lead_id
        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        // Filter berdasarkan create_by
        if ($request->has('create_by')) {
            $query->where('create_by', $request->create_by);
        }

        // Filter berdasarkan channel
        if ($request->has('channel')) {
            $query->where('channel', $request->channel);
        }

        // Filter berdasarkan tanggal
        if ($request->has('date_from')) {
            $query->whereDate('follow_up_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('follow_up_date', '<=', $request->date_to);
        }

        $query->orderBy('follow_up_date', 'desc');

        $perPage = $request->get('per_page', 15);
        $followUps = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data follow up berhasil diambil',
            'data' => $followUps->items(),
            'pagination' => [
                'current_page' => $followUps->currentPage(),
                'last_page' => $followUps->lastPage(),
                'per_page' => $followUps->perPage(),
                'total' => $followUps->total(),
            ],
        ]);
    }

    /**
     * Menampilkan detail follow up
     */
    public function show($id)
    {
        $followUp = FollowUpLead::with([
            'lead_rel',
            'lead_rel.customer_rel',
            'created_by_rel:id,nama'
        ])
        ->find($id);

        if (!$followUp) {
            return response()->json([
                'success' => false,
                'message' => 'Follow up tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data follow up berhasil diambil',
            'data' => $followUp
        ]);
    }

    /**
     * Membuat follow up baru
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'lead_id' => 'required|exists:ai_leads,id',
            'follow_up_date' => 'required|date',
            'channel' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'type' => 'required|in:whatsapp_out,call_out,send_price,interested,thinking,closed_won,closed_lost',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $lead = Lead::find($request->lead_id);
        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead tidak ditemukan'
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Buat follow up
            $followUp = FollowUpLead::create([
                'lead_id' => $request->lead_id,
                'follow_up_date' => Carbon::parse($request->follow_up_date)->format('Y-m-d H:i:s'),
                'channel' => $request->channel,
                'note' => $request->note,
                'status' => '1',
                'create_by' => Auth::id(),
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);

            // Catat aktivitas di aktivitas_lead
            $note = "Follow up via " . ($request->channel ?? 'unknown');
            if ($request->note) {
                $note .= ": " . $request->note;
            }

            AktivitasLead::create([
                'lead_id' => $request->lead_id,
                'customer_id' => $lead->customer_id,
                'user_id' => Auth::id(),
                'type' => $request->type,
                'note' => $note,
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);

            // Update last_contact_at di lead
            $lead->update([
                'last_contact_at' => Carbon::parse($request->follow_up_date)->format('Y-m-d H:i:s'),
                'update_at' => now()->format('Y-m-d H:i:s'),
            ]);

            // Update status lead berdasarkan type follow-up
            // Priority: closed_won/closed_lost > interested > NEW
            
            // Jika type adalah closed_won atau closed_lost, update status lead (final status)
            if ($request->type === 'closed_won') {
                $lead->update(['status' => 'CONVERTED']);
            } elseif ($request->type === 'closed_lost') {
                $lead->update(['status' => 'LOST']);
            } 
            // Jika type adalah interested, ubah ke QUALIFIED (kecuali sudah CONVERTED/LOST)
            elseif ($request->type === 'interested' && !in_array($lead->status, ['CONVERTED', 'LOST'])) {
                $lead->update(['status' => 'QUALIFIED']);
            }
            // Jika status lead adalah NEW, ubah ke CONTACTED (kecuali sudah diubah oleh type di atas)
            elseif ($lead->status === 'NEW' && !in_array($request->type, ['closed_won', 'closed_lost', 'interested'])) {
                $lead->update(['status' => 'CONTACTED']);
            }

            DB::commit();

            $followUp->load(['lead_rel', 'created_by_rel']);

            return response()->json([
                'success' => true,
                'message' => 'Follow up berhasil dibuat',
                'data' => $followUp
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat follow up: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update follow up
     */
    public function update(Request $request, $id)
    {
        $followUp = FollowUpLead::find($id);

        if (!$followUp) {
            return response()->json([
                'success' => false,
                'message' => 'Follow up tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'follow_up_date' => 'nullable|date',
            'channel' => 'nullable|string|max:50',
            'note' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = [];
        if ($request->has('follow_up_date')) {
            $updateData['follow_up_date'] = Carbon::parse($request->follow_up_date)->format('Y-m-d H:i:s');
        }
        if ($request->has('channel')) {
            $updateData['channel'] = $request->channel;
        }
        if ($request->has('note')) {
            $updateData['note'] = $request->note;
        }

        $followUp->update($updateData);
        $followUp->load(['lead_rel', 'created_by_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Follow up berhasil diupdate',
            'data' => $followUp
        ]);
    }

    /**
     * Hapus follow up (soft delete dengan status)
     */
    public function destroy($id)
    {
        $followUp = FollowUpLead::find($id);

        if (!$followUp) {
            return response()->json([
                'success' => false,
                'message' => 'Follow up tidak ditemukan'
            ], 404);
        }

        $followUp->update([
            'status' => 'N',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Follow up berhasil dihapus'
        ]);
    }

    /**
     * Statistik follow up
     */
    public function statistics(Request $request)
    {
        $query = FollowUpLead::where('status', '!=', 'N');

        // Filter berdasarkan lead_id jika ada
        if ($request->has('lead_id')) {
            $query->where('lead_id', $request->lead_id);
        }

        // Filter berdasarkan create_by jika ada
        if ($request->has('create_by')) {
            $query->where('create_by', $request->create_by);
        }

        // Filter berdasarkan tanggal
        if ($request->has('date_from')) {
            $query->whereDate('follow_up_date', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('follow_up_date', '<=', $request->date_to);
        }

        $totalFollowUps = $query->count();
        $byChannel = $query->select('channel', DB::raw('count(*) as total'))
            ->groupBy('channel')
            ->get()
            ->pluck('total', 'channel');

        return response()->json([
            'success' => true,
            'data' => [
                'total_follow_ups' => $totalFollowUps,
                'by_channel' => $byChannel,
            ]
        ]);
    }
}

