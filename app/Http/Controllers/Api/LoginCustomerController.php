<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Customer;

class LoginCustomerController extends Controller
{
    
    public function __invoke(Request $request)
    {
        
        $validator = Validator::make($request->all(), [
            'email'     => 'required|email',
            'password'  => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        // Cek apakah email ada di tabel Customer
        $customer = Customer::where('email', $credentials['email'])->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Akun tidak ditemukan',
            ], 404);
        }

        // Cek status aktif
        if ($customer->status === 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum aktif atau dinonaktifkan',
            ], 403);
        }

        // Coba login via guard customer
        if (! $token = auth()->guard('customer')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau password salah',
            ], 401);
        }

        // Ambil data user login
        $userLogin = auth()->guard('customer')->user();

        // Update last login time
        $userLogin->update([
            'last_login_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'user' => [
                'id'    => $userLogin->id,
                'nama'  => $userLogin->nama,
                'email' => $userLogin->email,
                'wa'    => $userLogin->wa,
                'alamat'=> $userLogin->alamat,
            ],
            'token' => $token,
        ], 200);
    }
}
