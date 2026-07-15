<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrShift;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class HrShiftController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrShift::query();

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('nama', 'ILIKE', "%{$search}%");
        }

        if ($request->has('is_flexible') && $request->is_flexible !== null) {
            $query->where('is_flexible', $request->is_flexible);
        }

        if ($request->has('all') && $request->all == 'true') {
            $shifts = $query->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $shifts,
                'total' => $shifts->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $shifts = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $shifts->items(),
            'pagination' => [
                'current_page' => $shifts->currentPage(),
                'last_page' => $shifts->lastPage(),
                'per_page' => $shifts->perPage(),
                'total' => $shifts->total(),
            ]
        ]);
    }

    public function show($id)
    {
        $shift = HrShift::find($id);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $shift
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:100',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'is_flexible' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $shift = HrShift::create([
            'nama' => $request->nama,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'is_flexible' => $request->is_flexible ?? false,
            'create_at' => Carbon::now()->format('Y-m-d H:i:s'),
            'update_at' => Carbon::now()->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil dibuat',
            'data' => $shift
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $shift = HrShift::find($id);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift tidak ditemukan'
            ], 404);
        }

        // $validator = Validator::make($request->all(), [
        //     'nama' => 'required|string|max:100',
        //     'start_time' => 'required|date_format:H:i',
        //     'end_time' => 'required|date_format:H:i|after:start_time',
        //     'is_flexible' => 'nullable|boolean',
        // ]);

        // if ($validator->fails()) {
        //     return response()->json([
        //         'success' => false,
        //         'message' => 'Validasi gagal',
        //         'errors' => $validator->errors()
        //     ], 422);
        // }

        $shift->nama = $request->nama ?? $shift->nama;
        $shift->start_time = $request->start_time ?? $shift->start_time;
        $shift->end_time = $request->end_time ?? $shift->end_time;
        $shift->is_flexible = $request->has('is_flexible') ? $request->is_flexible : $shift->is_flexible;
        $shift->update_at = Carbon::now()->format('Y-m-d H:i:s');
        $shift->save();

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil diupdate',
            'data' => $shift
        ]);
    }

    public function destroy($id)
    {
        $shift = HrShift::find($id);

        if (!$shift) {
            return response()->json([
                'success' => false,
                'message' => 'Shift tidak ditemukan'
            ], 404);
        }

        $karyawanCount = \App\Models\HrKaryawan::where('shift', $id)->count();
        if ($karyawanCount > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Shift tidak dapat dihapus karena masih digunakan oleh ' . $karyawanCount . ' karyawan'
            ], 422);
        }

        $shift->delete();

        return response()->json([
            'success' => true,
            'message' => 'Shift berhasil dihapus'
        ]);
    }
}

