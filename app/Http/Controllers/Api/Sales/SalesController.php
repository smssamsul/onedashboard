<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Sales;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class SalesController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get all sales with pagination
     */
    public function index(Request $request)
    {
        $query = Sales::with(['user_rel', 'karyawan_rel']);

        // Search berdasarkan nama user atau woowa_key
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user_rel', function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%");
            })->orWhere('woowa_key', 'ILIKE', "%{$search}%");
        }

        // Filter berdasarkan user_id
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Jika parameter all=true, return semua data tanpa pagination
        if ($request->has('all') && $request->all == 'true') {
            $sales = $query->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $sales,
                'total' => $sales->count()
            ]);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $sales = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $sales->items(),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
                'per_page' => $sales->perPage(),
                'total' => $sales->total(),
            ]
        ]);
    }

    /**
     * Get single sales by ID
     */
    public function show($id)
    {
        $sales = Sales::with(['user_rel', 'karyawan_rel'])->find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sales
        ]);
    }

    /**
     * Create new sales
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer|exists:user,id',
            'woowa_key' => 'nullable|string|max:150',
            'urutan' => 'nullable|string|max:150',
            'last_update_lead' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cek apakah user_id sudah ada di sales
        $existingSales = Sales::where('user_id', $request->user_id)->first();
        if ($existingSales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales dengan user_id tersebut sudah ada'
            ], 422);
        }

        // Jika urutan tidak diisi, generate otomatis
        $urutan = $request->urutan;
        if (!$urutan) {
            $urutan = (string)(Sales::count() + 1);
        }

        $sales = Sales::create([
            'user_id' => $request->user_id,
            'woowa_key' => $request->woowa_key,
            'urutan' => $urutan,
            'last_update_lead' => $request->last_update_lead,
            'create_at' => now()->format('Y-m-d H:i:s'),
            'update_at' => null,
        ]);

        $sales->load(['user_rel', 'karyawan_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil ditambahkan',
            'data' => $sales
        ], 201);
    }

    /**
     * Update sales
     */
    public function update(Request $request, $id)
    {
        $sales = Sales::find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|integer|exists:user,id',
            'woowa_key' => 'nullable|string|max:150',
            'urutan' => 'nullable|string|max:150',
            'last_update_lead' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Jika user_id diubah, cek apakah user_id baru sudah ada
        if ($request->has('user_id') && $request->user_id != $sales->user_id) {
            $existingSales = Sales::where('user_id', $request->user_id)
                ->where('id', '!=', $id)
                ->first();
            if ($existingSales) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales dengan user_id tersebut sudah ada'
                ], 422);
            }
        }

        $sales->user_id = $request->user_id ?? $sales->user_id;
        $sales->woowa_key = $request->woowa_key ?? $sales->woowa_key;
        $sales->urutan = $request->urutan ?? $sales->urutan;
        $sales->last_update_lead = $request->last_update_lead ?? $sales->last_update_lead;
        $sales->update_at = now()->format('Y-m-d H:i:s');
        $sales->save();

        $sales->load(['user_rel', 'karyawan_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil diupdate',
            'data' => $sales
        ]);
    }

    /**
     * Delete sales
     */
    public function destroy($id)
    {
        $sales = Sales::find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        $sales->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil dihapus'
        ]);
    }
}

