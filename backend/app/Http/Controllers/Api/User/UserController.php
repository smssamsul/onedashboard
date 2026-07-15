<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\HrAbsensi;
use App\Models\HrKaryawan;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Carbon\Carbon;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function getProfile(Request $request)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'nama' => $user->nama,
                'email' => $user->email,
                'no_telp' => $user->no_telp,
                'alamat' => $user->alamat,
                'divisi' => $user->divisi,
                'level' => $user->level,
            ]
        ]);
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'password' => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // Update password di user_login
        $userLogin = \App\Models\UserLogin::where('user', $user->id)->first();
        if ($userLogin) {
            $userLogin->password = Hash::make($request->password);
            $userLogin->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diubah'
        ]);
    }

    public function getAttendanceStats(Request $request)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // Get karyawan by user_id
        $karyawan = HrKaryawan::where(function($query) use ($user) {
                $query->where('user_id', $user->user);
            })
            ->where('status', '!=', 'N')
            ->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Karyawan tidak ditemukan'
            ], 404);
        }

        // Get current month attendance
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $totalDays = $now->daysInMonth;

        $attendanceCount = HrAbsensi::where('karyawan', $karyawan->id)
            ->whereBetween('tanggal', [
                $startOfMonth->format('Y-m-d'),
                $endOfMonth->format('Y-m-d')
            ])
            ->where('status_absensi', 'Hadir')
            ->count();

        $attendancePercentage = $totalDays > 0 ? round(($attendanceCount / $totalDays) * 100, 2) : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'attendance_count' => $attendanceCount,
                'total_days' => $totalDays,
                'attendance_percentage' => $attendancePercentage
            ]
        ]);
    }
}

