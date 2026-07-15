<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrTypeCuti;
use Illuminate\Support\Facades\Validator;

class HrTypeCutiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrTypeCuti::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('nama', 'ILIKE', "%{$search}%");
        }

        if ($request->has('all') && $request->all == 'true') {
            $types = $query->orderBy('id', 'asc')->get();

            return response()->json([
                'success' => true,
                'data' => $types,
                'total' => $types->count(),
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $types = $query->orderBy('id', 'asc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $types->items(),
            'pagination' => [
                'current_page' => $types->currentPage(),
                'last_page' => $types->lastPage(),
                'per_page' => $types->perPage(),
                'total' => $types->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'kuota' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $typeCuti = HrTypeCuti::create([
            'nama' => $request->nama,
            'kuota' => $request->kuota ?? null,
            'create_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Jenis cuti berhasil ditambahkan',
            'data' => $typeCuti
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $typeCuti = HrTypeCuti::find($id);

        if (!$typeCuti) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis cuti tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'sometimes|required|string|max:255',
            'kuota' => 'nullable|integer|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $typeCuti->nama = $request->nama ?? $typeCuti->nama;
        $typeCuti->kuota = $request->has('kuota') ? $request->kuota : $typeCuti->kuota;
        $typeCuti->update_at = now()->format('Y-m-d H:i:s');
        $typeCuti->save();

        return response()->json([
            'success' => true,
            'message' => 'Jenis cuti berhasil diperbarui',
            'data' => $typeCuti
        ]);
    }

    public function destroy($id)
    {
        $typeCuti = HrTypeCuti::find($id);

        if (!$typeCuti) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis cuti tidak ditemukan'
            ], 404);
        }

        // Cek apakah jenis cuti sedang digunakan
        $usedCount = \App\Models\HrCuti::where('type_cuti', $id)->count();
        if ($usedCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Jenis cuti tidak dapat dihapus karena sedang digunakan'
            ], 400);
        }

        $typeCuti->delete();

        return response()->json([
            'success' => true,
            'message' => 'Jenis cuti berhasil dihapus'
        ]);
    }
}

