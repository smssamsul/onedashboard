<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrIzin;
use App\Models\HrKaryawan;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class HrIzinController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrIzin::with(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel']);

        if ($request->has('karyawan') && $request->karyawan) {
            $query->where('karyawan', $request->karyawan);
        }

        if ($request->has('jenis_izin') && $request->jenis_izin) {
            $query->where('jenis_izin', $request->jenis_izin);
        }

        if ($request->has('status_izin') && $request->status_izin) {
            $query->where('status_izin', $request->status_izin);
        }

        if ($request->has('tanggal') && $request->tanggal) {
            $query->whereDate('tanggal', $request->tanggal);
        }

        if ($request->has('bulan') && $request->bulan) {
            $query->whereMonth('tanggal', Carbon::parse($request->bulan)->month)
                  ->whereYear('tanggal', Carbon::parse($request->bulan)->year);
        }

        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        // Filter untuk approval (atasan melihat izin yang perlu di-approve)
        if ($request->has('need_approval') && $request->need_approval == 'true') {
            $userLogin = auth('api')->user();
            if ($userLogin) {
                $userLogin->load('userData');
                $user = $userLogin->userData;
                
                if ($user) {
                    // Cari karyawan yang sesuai dengan user login
                    $karyawanLogin = HrKaryawan::where('user_id', $user->id)
                        ->where('status', '!=', 'N')
                        ->first();
                    
                    if ($karyawanLogin) {
                        // Ambil izin yang masih pending dan dari karyawan yang berada di departemen yang sama
                        // dan dari karyawan yang jabatannya lebih rendah (angka lebih besar = level lebih rendah)
                        $query->where('status_izin', 'pending')
                              ->whereHas('karyawan_rel', function($q) use ($karyawanLogin) {
                                  // Filter berdasarkan departemen yang sama dan jabatan lebih rendah
                                  $q->where('departemen', $karyawanLogin->departemen)
                                    ->where('jabatan', '>', $karyawanLogin->jabatan)
                                    ->where('status', '!=', 'N');
                              });
                    }
                }
            }
        }

        if ($request->has('all') && $request->all == 'true') {
            $izin = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();

            return response()->json([
                'success' => true,
                'data' => $izin,
                'total' => $izin->count()
            ]);
        }

        $perPage = $request->get('per_page', 15);
        $izin = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $izin->items(),
            'pagination' => [
                'current_page' => $izin->currentPage(),
                'last_page' => $izin->lastPage(),
                'per_page' => $izin->perPage(),
                'total' => $izin->total(),
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

        $query = HrIzin::with(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel'])
            ->where('karyawan', $karyawan->id)
            ->where('status', '!=', 'N');

        if ($request->has('status_izin') && $request->status_izin) {
            $query->where('status_izin', $request->status_izin);
        }

        if ($request->has('jenis_izin') && $request->jenis_izin) {
            $query->where('jenis_izin', $request->jenis_izin);
        }

        $izin = $query->orderBy('tanggal', 'desc')->orderBy('id', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $izin
        ]);
    }

    public function show($id)
    {
        $izin = HrIzin::with(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel'])->find($id);

        if (!$izin) {
            return response()->json([
                'success' => false,
                'message' => 'Izin tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $izin
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'karyawan' => 'required|exists:hr_karyawan,id',
            'jenis_izin' => 'required|in:WFH,izin_telat,izin_sakit',
            'tanggal' => 'required_if:jenis_izin,izin_telat,izin_sakit|date',
            'tanggal_mulai' => 'required_if:jenis_izin,WFH|date',
            'tanggal_akhir' => 'required_if:jenis_izin,WFH|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'required_if:jenis_izin,izin_telat|date_format:H:i',
            'alasan' => 'required|string|min:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $karyawan = HrKaryawan::find($request->karyawan);
        
        $izin = new HrIzin();
        $izin->karyawan = $request->karyawan;
        $izin->jenis_izin = $request->jenis_izin;
        $izin->alasan = $request->alasan;
        $izin->status_izin = 'pending';
        $izin->status = '1';
        $izin->create_at = Carbon::now()->format('Y-m-d H:i:s');
        $izin->update_at = Carbon::now()->format('Y-m-d H:i:s');

        if ($request->jenis_izin === 'WFH') {
            $izin->tanggal_mulai = $request->tanggal_mulai;
            $izin->tanggal_akhir = $request->tanggal_akhir;
        } else {
            $izin->tanggal = $request->tanggal;
            if ($request->jenis_izin === 'izin_telat') {
                $izin->jam_mulai = $request->jam_mulai;
            }
        }

        // Set approval_direksi dari karyawan.approval jika ada
        if ($karyawan && $karyawan->approval) {
            $izin->approval_direksi = $karyawan->approval;
            $izin->status_approval_direksi = 'pending';
        }

        $izin->save();

        $izin->load(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan izin berhasil dibuat',
            'data' => $izin
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
            'jenis_izin' => 'required|in:WFH,izin_telat,izin_sakit',
            'tanggal' => 'required_if:jenis_izin,izin_telat,izin_sakit|date',
            'tanggal_mulai' => 'required_if:jenis_izin,WFH|date',
            'tanggal_akhir' => 'required_if:jenis_izin,WFH|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'required_if:jenis_izin,izin_telat|date_format:H:i',
            'alasan' => 'required|string|min:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $izin = new HrIzin();
        $izin->karyawan = $karyawan->id;
        $izin->jenis_izin = $request->jenis_izin;
        $izin->alasan = $request->alasan;
        $izin->status_izin = 'pending';
        $izin->status = '1';
        $izin->create_at = Carbon::now()->format('Y-m-d H:i:s');
        $izin->update_at = Carbon::now()->format('Y-m-d H:i:s');

        if ($request->jenis_izin === 'WFH') {
            $izin->tanggal_mulai = $request->tanggal_mulai;
            $izin->tanggal_akhir = $request->tanggal_akhir;
        } else {
            $izin->tanggal = $request->tanggal;
            if ($request->jenis_izin === 'izin_telat') {
                $izin->jam_mulai = $request->jam_mulai;
            }
        }

        // Set approval_direksi dari karyawan.approval jika ada
        if ($karyawan->approval) {
            $izin->approval_direksi = $karyawan->approval;
            $izin->status_approval_direksi = 'pending';
        }

        $izin->save();

        $izin->load(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Pengajuan izin berhasil dibuat',
            'data' => $izin
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $izin = HrIzin::find($id);

        if (!$izin) {
            return response()->json([
                'success' => false,
                'message' => 'Izin tidak ditemukan'
            ], 404);
        }

        // Hanya bisa edit jika status masih pending
        if ($izin->status_izin !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Izin yang sudah di-approve atau di-reject tidak dapat diubah'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'jenis_izin' => 'sometimes|in:WFH,izin_telat,izin_sakit',
            'tanggal' => 'required_if:jenis_izin,izin_telat,izin_sakit|date',
            'tanggal_mulai' => 'required_if:jenis_izin,WFH|date',
            'tanggal_akhir' => 'required_if:jenis_izin,WFH|date|after_or_equal:tanggal_mulai',
            'jam_mulai' => 'required_if:jenis_izin,izin_telat|date_format:H:i',
            'alasan' => 'sometimes|string|min:10',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('jenis_izin')) {
            $izin->jenis_izin = $request->jenis_izin;
        }

        if ($request->has('alasan')) {
            $izin->alasan = $request->alasan;
        }

        if ($request->has('tanggal_mulai')) {
            $izin->tanggal_mulai = $request->tanggal_mulai;
        }

        if ($request->has('tanggal_akhir')) {
            $izin->tanggal_akhir = $request->tanggal_akhir;
        }

        if ($request->has('tanggal')) {
            $izin->tanggal = $request->tanggal;
        }

        if ($request->has('jam_mulai')) {
            $izin->jam_mulai = $request->jam_mulai;
        }

        $izin->update_at = Carbon::now()->format('Y-m-d H:i:s');
        $izin->save();

        $izin->load(['karyawan_rel', 'approved_by_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Izin berhasil diupdate',
            'data' => $izin
        ]);
    }

    public function approve(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'status_izin' => 'required|in:approved,rejected',
            'catatan_approval' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $izin = HrIzin::find($id);

        if (!$izin) {
            return response()->json([
                'success' => false,
                'message' => 'Izin tidak ditemukan'
            ], 404);
        }

        if ($izin->status_izin !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Izin ini sudah diproses sebelumnya'
            ], 422);
        }

        $userLogin = auth('api')->user();
        if (!$userLogin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $userLogin->load('userData');
        $user = $userLogin->userData;

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User data not found'
            ], 404);
        }

        // Cari karyawan yang approve
        $karyawanApprover = HrKaryawan::where('user_id', $user->id)
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawanApprover) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan approver tidak ditemukan'
            ], 404);
        }

        $karyawanPemohon = HrKaryawan::with('user_rel')->find($izin->karyawan);
        $isDireksi = ($user->divisi == '9' || $user->divisi == 9);
        $isHR = ($user->divisi == '5' || $user->divisi == 5);
        
        // Jika ada approval_direksi, urutan: direksi approve dulu, baru HR bisa approve
        if ($izin->approval_direksi) {
            if ($isDireksi && $karyawanApprover->id == $izin->approval_direksi) {
                // Approval oleh direksi (langkah pertama)
                if ($izin->status_approval_direksi === 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Pengajuan izin sudah di-approve oleh direksi'
                    ], 400);
                }
                
                if ($request->status_izin === 'approved') {
                    $izin->status_approval_direksi = 'approved';
                    $izin->approved_direksi_at = Carbon::now();
                    // Status izin tetap pending sampai HR approve
                    $izin->status_izin = 'pending';
                } else {
                    $izin->status_approval_direksi = 'rejected';
                    $izin->status_izin = 'rejected';
                }
                $izin->catatan_approval_direksi = $request->catatan_approval;
            } else if ($isHR) {
                // Approval oleh HR (langkah kedua, setelah direksi approve)
                if ($izin->status_approval_direksi !== 'approved') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Pengajuan izin harus di-approve oleh direksi terlebih dahulu'
                    ], 400);
                }
                
                if ($request->status_izin === 'approved') {
                    $izin->approved_by = $karyawanApprover->id;
                    $izin->catatan_approval = $request->catatan_approval;
                    $izin->approved_at = Carbon::now();
                    $izin->status_izin = 'approved';
                } else {
                    $izin->status_izin = 'rejected';
                    $izin->approved_by = $karyawanApprover->id;
                    $izin->catatan_approval = $request->catatan_approval;
                    $izin->approved_at = Carbon::now();
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
                    'message' => 'Hanya HR yang dapat approve pengajuan izin tanpa approval direksi'
                ], 403);
            }
            
            $izin->status_izin = $request->status_izin;
            $izin->approved_by = $karyawanApprover->id;
            $izin->catatan_approval = $request->catatan_approval;
            $izin->approved_at = Carbon::now();
        }

        $izin->update_at = Carbon::now()->format('Y-m-d H:i:s');
        $izin->save();

        $izin->load(['karyawan_rel', 'approved_by_rel', 'approval_direksi_rel']);

        $message = $izin->status_izin === 'approved' 
            ? 'Izin berhasil disetujui'
            : ($izin->status_izin === 'pending' 
                ? 'Pengajuan izin telah di-approve oleh atasan, menunggu approval direksi'
                : 'Izin ditolak');

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $izin
        ]);
    }

    public function destroy($id)
    {
        $izin = HrIzin::find($id);

        if (!$izin) {
            return response()->json([
                'success' => false,
                'message' => 'Izin tidak ditemukan'
            ], 404);
        }

        // Hanya bisa hapus jika status masih pending
        if ($izin->status_izin !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Izin yang sudah diproses tidak dapat dihapus'
            ], 422);
        }

        $izin->status = 'N';
        $izin->update_at = Carbon::now()->format('Y-m-d H:i:s');
        $izin->save();

        return response()->json([
            'success' => true,
            'message' => 'Izin berhasil dihapus'
        ]);
    }
}
