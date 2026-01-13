<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FollowUpOrder;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class FollowUpOrderController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Menampilkan daftar follow up untuk order tertentu
     */
    public function index(Request $request, $orderId)
    {
        $query = FollowUpOrder::where('order_id', $orderId)
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
        $query = FollowUpOrder::with([
            'order_rel:id,customer,produk,total_harga,status_order',
            'order_rel.customer_rel:id,nama,email,wa',
            'order_rel.produk_rel:id,nama',
            'created_by_rel:id,nama'
        ])
        ->where('status', '!=', 'N');

        // Filter berdasarkan order_id
        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
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
        $followUp = FollowUpOrder::with([
            'order_rel',
            'order_rel.customer_rel',
            'order_rel.produk_rel',
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
            'order_id' => 'required|exists:order_customer,id',
            'follow_up_date' => 'required|date',
            'channel' => 'nullable|string|max:50',
            'note' => 'nullable|string',
            'type' => 'required|in:whatsapp_out,call_out,send_price,payment_reminder,order_update,closed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $order = OrderCustomer::find($request->order_id);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Buat follow up
            $followUp = FollowUpOrder::create([
                'order_id' => $request->order_id,
                'follow_up_date' => Carbon::parse($request->follow_up_date)->format('Y-m-d H:i:s'),
                'channel' => $request->channel,
                'note' => $request->note,
                'type' => $request->type,
                'status' => '1',
                'create_by' => Auth::id(),
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);

            DB::commit();

            $followUp->load(['order_rel', 'created_by_rel']);

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
        $followUp = FollowUpOrder::find($id);

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
            'type' => 'nullable|in:whatsapp_out,call_out,send_price,payment_reminder,order_update,closed',
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
        if ($request->has('type')) {
            $updateData['type'] = $request->type;
        }

        $followUp->update($updateData);
        $followUp->load(['order_rel', 'created_by_rel']);

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
        $followUp = FollowUpOrder::find($id);

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
        $query = FollowUpOrder::where('status', '!=', 'N');

        // Filter berdasarkan order_id jika ada
        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
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

