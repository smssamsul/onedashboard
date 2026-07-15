<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrCuti;
use App\Models\HrKaryawan;
use App\Models\HrTypeCuti;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class HrCutiController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrCuti::with(['karyawan_rel', 'type_rel', 'approved_by_rel', 'approval_direksi_rel']);

        if ($request->has('karyawan') && $request->karyawan) {
            $query->where('karyawan', $request->karyawan);
        }

        if ($request->has('start_date') && $request->has('end_date') &&
            $request->start_date && $request->end_date) {
            $start = Carbon::parse($request->start_date)->startOfDay();
            $end = Carbon::parse($request->end_date)->endOfDay();

            $query->whereDate('start_date', '>=', $start->toDateString())
                  ->whereDate('end_date', '<=', $end->toDateString());
        }

        if ($request->has('bulan') && $request->bulan) {
            $query->whereMonth('start_date', Carbon::parse($request->bulan)->month)
                  ->whereYear('start_date', Carbon::parse($request->bulan)->year);
        }

        if ($request->has('status_cuti') && $request->status_cuti) {
            $query->where('status_cuti', $request->status_cuti);
        }

        if ($request->has('type_cuti') && $request->type_cuti) {
            $query->where('type_cuti', $request->type_cuti);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        if ($request->has('all') && $request->all == 'true') {
            $cuti = $query->orderBy('start_date', 'desc')->orderBy('id', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $cuti,
                'total' => $cuti->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $cuti = $query->orderBy('start_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $cuti->items(),
            'pagination' => [
                'current_page' => $cuti->currentPage(),
                'last_page' => $cuti->lastPage(),
                'per_page' => $cuti->perPage(),
                'total' => $cuti->total(),
            ]
        ]);
    }

    public function getByCurrentUser(Request $request)
    {
        $user = auth()->guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        $karyawan = HrKaryawan::where('user_id', $user->user)
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan untuk user ini'
            ], 404);
        }

        $query = HrCuti::with(['karyawan_rel', 'type_rel'])
            ->where('karyawan', $karyawan->id);

        if ($request->has('start_date') && $request->has('end_date') &&
            $request->start_date && $request->end_date) {
            $start = Carbon::parse($request->start_date)->startOfDay();
            $end = Carbon::parse($request->end_date)->endOfDay();

            $query->whereDate('start_date', '>=', $start->toDateString())
                  ->whereDate('end_date', '<=', $end->toDateString());
        }

        if ($request->has('bulan') && $request->bulan) {
            $query->whereMonth('start_date', Carbon::parse($request->bulan)->month)
                  ->whereYear('start_date', Carbon::parse($request->bulan)->year);
        }

        if ($request->has('status_cuti') && $request->status_cuti) {
            $query->where('status_cuti', $request->status_cuti);
        }

        if ($request->has('type_cuti') && $request->type_cuti) {
            $query->where('type_cuti', $request->type_cuti);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        if ($request->has('all') && $request->all == 'true') {
            $cuti = $query->orderBy('start_date', 'desc')->orderBy('id', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $cuti,
                'total' => $cuti->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $cuti = $query->orderBy('start_date', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $cuti->items(),
            'pagination' => [
                'current_page' => $cuti->currentPage(),
                'last_page' => $cuti->lastPage(),
                'per_page' => $cuti->perPage(),
                'total' => $cuti->total(),
            ]
        ]);
    }

    public function show($id)
    {
        if (!is_numeric($id) || (int)$id != $id) {
            return response()->json([
                'success' => false,
                'message' => 'ID cuti tidak valid'
            ], 400);
        }

        $cuti = HrCuti::with(['karyawan_rel', 'type_rel'])->find($id);

        if (!$cuti) {
            return response()->json([
                'success' => false,
                'message' => 'Data cuti tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $cuti
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'karyawan' => 'required|exists:hr_karyawan,id',
            'type_cuti' => 'required|exists:hr_type_cuti,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'alasan' => 'nullable|string',
            'status_cuti' => 'nullable|string|max:30',
            'status' => 'nullable|string|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        $data['status_cuti'] = $data['status_cuti'] ?? 'pending';
        $data['status'] = $data['status'] ?? '1';
        $data['create_at'] = now()->format('Y-m-d H:i:s');

        $cuti = HrCuti::create($data);

        $cuti->load(['karyawan_rel', 'type_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Data cuti berhasil ditambahkan',
            'data' => $cuti
        ], 201);
    }

    public function storeByCurrentUser(Request $request)
    {
        $user = auth()->guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        $karyawan = HrKaryawan::where('user_id', $user->user)
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan untuk user ini'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'type_cuti' => 'required|exists:hr_type_cuti,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'alasan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        $data['karyawan'] = $karyawan->id;
        $data['status_cuti'] = 'pending';
        $data['status'] = '1';
        $data['create_at'] = now()->format('Y-m-d H:i:s');
        
        // Set approval_direksi dari karyawan.approval jika ada
        if ($karyawan->approval) {
            $data['approval_direksi'] = $karyawan->approval;
            $data['status_approval_direksi'] = 'pending';
        }

        $cuti = HrCuti::create($data);
        $cuti->load(['karyawan_rel', 'type_rel', 'approved_by_rel', 'approval_direksi_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan cuti berhasil dibuat',
            'data' => $cuti
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $cuti = HrCuti::find($id);

        if (!$cuti) {
            return response()->json([
                'success' => false,
                'message' => 'Data cuti tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'karyawan' => 'nullable|exists:hr_karyawan,id',
            'type_cuti' => 'nullable|exists:hr_type_cuti,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'alasan' => 'nullable|string',
            'status_cuti' => 'nullable|string|max:30',
            'status' => 'nullable|string|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $validator->validated();
        $data['update_at'] = now()->format('Y-m-d H:i:s');

        $cuti->update($data);
        $cuti->load(['karyawan_rel', 'type_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Data cuti berhasil diperbarui',
            'data' => $cuti
        ]);
    }

    public function destroy($id)
    {
        $cuti = HrCuti::find($id);

        if (!$cuti) {
            return response()->json([
                'success' => false,
                'message' => 'Data cuti tidak ditemukan'
            ], 404);
        }

        $cuti->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data cuti berhasil dihapus'
        ]);
    }

    public function approve($id)
    {
        $user = auth()->guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        $cuti = HrCuti::with(['karyawan_rel', 'karyawan_rel.user_rel'])->find($id);

        if (!$cuti) {
            return response()->json([
                'success' => false,
                'message' => 'Data cuti tidak ditemukan'
            ], 404);
        }

        // Cek jika sudah disetujui sebelumnya
        if ($cuti->status_cuti === 'disetujui') {
            return response()->json([
                'success' => false,
                'message' => 'Pengajuan cuti sudah disetujui sebelumnya'
            ], 400);
        }

        // Cari karyawan yang login
        $karyawanLogin = HrKaryawan::where('user_id', $user->user)
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawanLogin) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan untuk user ini'
            ], 404);
        }

        $karyawanLogin->load('user_rel');
        $isDireksi = ($karyawanLogin->user_rel && ($karyawanLogin->user_rel->divisi == '9' || $karyawanLogin->user_rel->divisi == 9));
        $isHR = ($karyawanLogin->user_rel && ($karyawanLogin->user_rel->divisi == '5' || $karyawanLogin->user_rel->divisi == 5));

        // Jika ada approval_direksi, urutan: direksi approve dulu, baru HR bisa approve
        if ($cuti->approval_direksi) {
            if ($isDireksi && $karyawanLogin->id == $cuti->approval_direksi) {
                // Approval oleh direksi (langkah pertama)
                if ($cuti->status_approval_direksi === 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Pengajuan cuti sudah di-approve oleh direksi'
                    ], 400);
                }
                
                $cuti->status_approval_direksi = 'approved';
                $cuti->approved_direksi_at = now();
                // Status cuti tetap pending sampai HR approve
                $cuti->status_cuti = 'pending';
            } else if ($isHR) {
                // Approval oleh HR (langkah kedua, setelah direksi approve)
                if ($cuti->status_approval_direksi !== 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Pengajuan cuti harus di-approve oleh direksi terlebih dahulu'
                    ], 400);
                }
                
                $cuti->approved_by = $karyawanLogin->id;
                $cuti->status_cuti = 'disetujui';
                
                // Hitung jumlah hari cuti dan kurangi kuota
                $startDate = \Carbon\Carbon::parse($cuti->start_date);
                $endDate = \Carbon\Carbon::parse($cuti->end_date);
                $jumlahHari = $startDate->diffInDays($endDate) + 1;
                
                if ($cuti->karyawan_rel) {
                    $karyawan = $cuti->karyawan_rel;
                    $kuotaCuti = $karyawan->kuota_cuti ?? 0;
                    
                    if ($kuotaCuti < $jumlahHari) {
                        return response()->json([
                            'success' => false,
                            'message' => "Kuota cuti tidak mencukupi. Kuota tersedia: {$kuotaCuti} hari, butuh: {$jumlahHari} hari"
                        ], 400);
                    }

                    $karyawan->kuota_cuti = $kuotaCuti - $jumlahHari;
                    $karyawan->save();
                }
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki hak untuk approve pengajuan ini'
                ], 403);
            }
        } else {
            // Tidak ada approval_direksi, langsung approve oleh HR seperti biasa
            if (!$isHR) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya HR yang dapat approve pengajuan cuti tanpa approval direksi'
                ], 403);
            }
            
            $cuti->approved_by = $karyawanLogin->id;
            $cuti->status_cuti = 'disetujui';
            
            // Hitung jumlah hari cuti dan kurangi kuota
            $startDate = \Carbon\Carbon::parse($cuti->start_date);
            $endDate = \Carbon\Carbon::parse($cuti->end_date);
            $jumlahHari = $startDate->diffInDays($endDate) + 1;
            
            if ($cuti->karyawan_rel) {
                $karyawan = $cuti->karyawan_rel;
                $kuotaCuti = $karyawan->kuota_cuti ?? 0;
                
                if ($kuotaCuti < $jumlahHari) {
                    return response()->json([
                        'success' => false,
                        'message' => "Kuota cuti tidak mencukupi. Kuota tersedia: {$kuotaCuti} hari, butuh: {$jumlahHari} hari"
                    ], 400);
                }

                $karyawan->kuota_cuti = $kuotaCuti - $jumlahHari;
                $karyawan->save();
            }
        }

        $cuti->update_at = now()->format('Y-m-d H:i:s');
        $cuti->save();

        $cuti->load(['karyawan_rel', 'type_rel', 'approved_by_rel', 'approval_direksi_rel']);

        $message = $cuti->status_cuti === 'disetujui' 
            ? 'Pengajuan cuti disetujui. Kuota cuti berkurang ' . $jumlahHari . ' hari'
            : 'Pengajuan cuti telah di-approve oleh atasan, menunggu approval direksi';

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $cuti
        ]);
    }

    public function reject(Request $request, $id)
    {
        $user = auth()->guard('api')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        $cuti = HrCuti::find($id);

        if (!$cuti) {
            return response()->json([
                'success' => false,
                'message' => 'Data cuti tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'alasan_penolakan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $cuti->status_cuti = 'ditolak';

        if ($request->filled('alasan_penolakan')) {
            $alasanLama = $cuti->alasan ? $cuti->alasan . "\n\n" : '';
            $cuti->alasan = $alasanLama . 'Alasan penolakan: ' . $request->alasan_penolakan;
        }

        $cuti->approved_by = $user->user ?? $user->id;
        $cuti->update_at = now()->format('Y-m-d H:i:s');
        $cuti->save();

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan cuti ditolak',
            'data' => $cuti
        ]);
    }
}

