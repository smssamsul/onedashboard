<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrKaryawan;
use App\Models\HrDepartemen;
use App\Models\User;
use App\Models\UserLogin;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class HrKaryawanController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = HrKaryawan::with(['departemen_rel', 'user_rel']);

        // Filter berdasarkan status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        } else {
            $query->where('status', '!=', 'N');
        }

        // Search berdasarkan nama, email, atau notelp
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('notelp', 'ILIKE', "%{$search}%");
            });
        }

        // Filter berdasarkan departemen
        if ($request->has('departemen') && $request->departemen) {
            $query->where('departemen', $request->departemen);
        }


        // Filter berdasarkan status_karyawan
        if ($request->has('status_karyawan') && $request->status_karyawan) {
            $query->where('status_karyawan', $request->status_karyawan);
        }

        // Jika parameter all=true, return semua data tanpa pagination
        if ($request->has('all') && $request->all == 'true') {
            $karyawan = $query->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $karyawan,
                'total' => $karyawan->count()
            ]);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $karyawan = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $karyawan->items(),
            'pagination' => [
                'current_page' => $karyawan->currentPage(),
                'last_page' => $karyawan->lastPage(),
                'per_page' => $karyawan->perPage(),
                'total' => $karyawan->total(),
            ]
        ]);
    }

    public function show($id)
    {
        $karyawan = HrKaryawan::with(['departemen_rel', 'user_rel'])->find($id);

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $karyawan
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:150',
            'user' => 'nullable|exists:user,id',
            'jenis_kelamin' => 'nullable|string|max:10',
            'tanggal_lahir' => 'nullable|date',
            'notelp' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'tanggal_join' => 'required|date',
            'tanggal_resign' => 'nullable|date',
            'status_karyawan' => 'nullable|string|max:50',
            'departemen' => 'nullable|exists:hr_departemen,id',
            'jabatan' => 'required|integer|in:1,2',
            'shift' => 'nullable|exists:hr_shift,id',
            'alamat' => 'nullable|string',
            'avatar_url' => 'nullable|string',
            'status' => 'nullable|string|max:1',
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
            $userId = $request->user;
            
            if (!$userId) {
                // Generate email jika tidak ada
                $email = $request->email;
                if (!$email) {
                    // Generate email dari nama atau notelp
                    $baseEmail = strtolower(str_replace(' ', '', $request->nama));
                    $email = $baseEmail . '@company.local';
                    
                    // Cek apakah email sudah ada, jika ya tambahkan angka
                    $counter = 1;
                    while (UserLogin::where('email', $email)->exists()) {
                        $email = $baseEmail . $counter . '@company.local';
                        $counter++;
                    }
                } else {
                    // Cek apakah email sudah ada di user_login
                    if (UserLogin::where('email', $email)->exists()) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Email sudah digunakan oleh user lain'
                        ], 422);
                    }
                }

                // Buat user baru
                $user = User::create([
                    'nama' => $request->nama,
                    'email' => $email,
                    'tanggal_lahir' => $request->tanggal_lahir,
                    'tanggal_join' => $request->tanggal_join,
                    'alamat' => $request->alamat,
                    'divisi' => $request->departemen, 
                    'level' => $request->jabatan, // HR level
                    'no_telp' => $request->notelp,
                    'status' => $request->status ?? '1',
                    'create_at' => now()->format('Y-m-d H:i:s'),
                ]);

                // Buat user_login dengan password default 123456
                $userLogin = UserLogin::create([
                    'email' => $email,
                    'password' => Hash::make('123456'),
                    'user' => $user->id,
                ]);

                $userId = $user->id;
            }

            // Buat karyawan
            $karyawan = HrKaryawan::create([
                'user_id' => $userId,
                'nama' => $request->nama,
                'jenis_kelamin' => $request->jenis_kelamin,
                'tanggal_lahir' => $request->tanggal_lahir,
                'notelp' => $request->notelp,
                'email' => $request->email ?? $email ?? null,
                'tanggal_join' => $request->tanggal_join,
                'tanggal_resign' => $request->tanggal_resign,
                'status_karyawan' => $request->status_karyawan,
                'departemen' => $request->departemen,
                'jabatan' => (int)$request->jabatan,
                'shift' => $request->shift,
                'alamat' => $request->alamat,
                'avatar_url' => $request->avatar_url,
                'status' => $request->status ?? '1',
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);

            DB::commit();

            $karyawan->load(['departemen_rel', 'user_rel']);

            return response()->json([
                'success' => true,
                'message' => 'Karyawan berhasil ditambahkan. User dan akun login telah dibuat dengan password default: 123456',
                'data' => $karyawan
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat menyimpan data: ' . $e->getMessage()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $karyawan = HrKaryawan::find($id);

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:150',
            'user' => 'nullable|exists:user,id',
            'jenis_kelamin' => 'nullable|string|max:10',
            'tanggal_lahir' => 'nullable|date',
            'notelp' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:150',
            'tanggal_join' => 'nullable|date',
            'tanggal_resign' => 'nullable|date',
            'status_karyawan' => 'nullable|string|max:50',
            'departemen' => 'nullable|exists:hr_departemen,id',
            'jabatan' => 'required|integer|in:1,2',
            'alamat' => 'nullable|string',
            'avatar_url' => 'nullable|string',
            'status' => 'nullable|string|max:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $karyawan->user_id = $request->user ?? $karyawan->user;
        $karyawan->nama = $request->nama;
        $karyawan->jenis_kelamin = $request->jenis_kelamin ?? $karyawan->jenis_kelamin;
        $karyawan->tanggal_lahir = $request->tanggal_lahir ?? $karyawan->tanggal_lahir;
        $karyawan->notelp = $request->notelp ?? $karyawan->notelp;
        $karyawan->email = $request->email ?? $karyawan->email;
        $karyawan->tanggal_join = $request->tanggal_join ?? $karyawan->tanggal_join;
        $karyawan->tanggal_resign = $request->tanggal_resign ?? $karyawan->tanggal_resign;
        $karyawan->status_karyawan = $request->status_karyawan ?? $karyawan->status_karyawan;
        $karyawan->departemen = $request->departemen ?? $karyawan->departemen;
        $karyawan->jabatan = $request->jabatan ? (int)$request->jabatan : $karyawan->jabatan;
        $karyawan->shift = $request->shift ?? $karyawan->shift;
        $karyawan->alamat = $request->alamat ?? $karyawan->alamat;
        $karyawan->avatar_url = $request->avatar_url ?? $karyawan->avatar_url;
        $karyawan->status = $request->status ?? $karyawan->status;
        $karyawan->update_at = now()->format('Y-m-d H:i:s');
        $karyawan->save();

        $karyawan->load(['departemen_rel', 'user_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Karyawan berhasil diupdate',
            'data' => $karyawan
        ]);
    }

    public function destroy($id)
    {
        $karyawan = HrKaryawan::find($id);

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan'
            ], 404);
        }

        // Soft delete dengan mengubah status
        $karyawan->status = 'N';
        $karyawan->update_at = now()->format('Y-m-d H:i:s');
        $karyawan->save();

        return response()->json([
            'success' => true,
            'message' => 'Karyawan berhasil dihapus'
        ]);
    }

    /**
     * Get karyawan by current logged in user
     */
    public function getByCurrentUser(Request $request)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // Cari karyawan berdasarkan user_id atau user (cek kedua field)
        $karyawan = HrKaryawan::where(function($query) use ($user) {
                $query->where('user_id', $user->user);
            })
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan untuk us: ' . $user->id
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $karyawan
        ]);
    }
}

