<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrDepartemen;
use Illuminate\Support\Facades\Validator;

class HrDepartemenController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrDepartemen::query();

        // Search berdasarkan nama
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('nama', 'ILIKE', "%{$search}%");
        }


        $departemen = $query->orderBy('id', 'desc')->get();
        
        return response()->json([
            'success' => true,
            'data' => $departemen,
            'total' => $departemen->count()
        ]);

    }

    public function show($id)
    {
        $departemen = HrDepartemen::with('karyawan')->find($id);

        if (!$departemen) {
            return response()->json([
                'success' => false,
                'message' => 'Departemen tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $departemen
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $departemen = HrDepartemen::create([
            'nama' => $request->nama,
            'create_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Departemen berhasil ditambahkan',
            'data' => $departemen
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $departemen = HrDepartemen::find($id);

        if (!$departemen) {
            return response()->json([
                'success' => false,
                'message' => 'Departemen tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:150',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $departemen->nama = $request->nama;
        $departemen->update_at = now()->format('Y-m-d H:i:s');
        $departemen->save();

        return response()->json([
            'success' => true,
            'message' => 'Departemen berhasil diupdate',
            'data' => $departemen
        ]);
    }

    public function destroy($id)
    {
        $departemen = HrDepartemen::find($id);

        if (!$departemen) {
            return response()->json([
                'success' => false,
                'message' => 'Departemen tidak ditemukan'
            ], 404);
        }

        // Cek apakah ada karyawan yang menggunakan departemen ini
        $hasKaryawan = $departemen->karyawan()->count() > 0;

        if ($hasKaryawan) {
            return response()->json([
                'success' => false,
                'message' => 'Departemen tidak dapat dihapus karena masih digunakan oleh karyawan'
            ], 422);
        }

        $departemen->delete();

        return response()->json([
            'success' => true,
            'message' => 'Departemen berhasil dihapus'
        ]);
    }
}

