<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\UserLogin;
use Exception;

class LogoutController extends Controller
{
    /**
     * Handle user logout.
     */
    public function __invoke(Request $request)
    {
        try {
            // ✅ Ambil user yang sedang login
            $user = auth()->guard('api')->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User tidak ditemukan atau token tidak valid.'
                ], 401);
            }

            // ✅ Ambil token dari header Authorization
            $token = $request->bearerToken();

            // ✅ Hapus / kosongkan token dari tabel user_logins
            UserLogin::where('id', $user->id)->update([
                'token' => null
            ]);

            // ✅ Blacklist token agar tidak bisa digunakan lagi
            auth()->guard('api')->logout();

            return response()->json([
                'success' => true,
                'message' => 'Logout berhasil. Token telah dihapus dan diblacklist.'
            ], 200);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal logout: ' . $e->getMessage()
            ], 500);
        }
    }
}