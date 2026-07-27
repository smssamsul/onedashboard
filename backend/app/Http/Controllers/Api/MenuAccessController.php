<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HrKaryawan;
use App\Models\MenuAkses;

class MenuAccessController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Ambil daftar menu yang boleh diakses user saat ini, dihitung LIVE
     * dari data hr_karyawan (departemen + jabatan), bukan dari user.divisi/level
     * yang cuma disalin sekali saat karyawan dibuat dan bisa drift.
     */
    public function index()
    {
        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;

        $karyawan = HrKaryawan::where('user_id', $user->id)->first();

        if (!$karyawan) {
            return response()->json([
                'success' => false,
                'message' => 'Data karyawan tidak ditemukan untuk user ini'
            ], 404);
        }

        $menu = MenuAkses::where('departemen_id', $karyawan->departemen)
            ->where('jabatan_id', $karyawan->jabatan)
            ->with('menu')
            ->get()
            ->pluck('menu')
            ->filter(fn ($m) => $m && $m->status !== 'N')
            ->sortBy([['section', 'asc'], ['urutan', 'asc']])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $menu
        ], 200);
    }
}
