<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\OtpCus;
use App\Models\Customer;

class OtpCustomerController extends Controller
{
    public function sendOtp(Request $request)
    {
        // Ambil customer_id dari authenticated user (jika sudah login)
        // Atau dari request body (jika belum login)
        $customerId = null;
        $wa = null;
        
        if (auth()->guard('customer')->check()) {
            // Jika sudah login, ambil dari authenticated user
            $customer = auth()->guard('customer')->user();
            $customerId = $customer->id;
            $wa = $customer->wa ?? $request->wa;
            
            if (!$wa) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp tidak ditemukan. Silakan lengkapi profil Anda.'
                ], 400);
            }
        } else {
            // Jika belum login, validasi dan ambil dari request
            $request->validate([
                'customer_id' => 'required|integer',
                'wa' => 'required|string'
            ]);
            $customerId = $request->customer_id;
            $wa = $request->wa;
        }

        // Ambil data customer dari tabel
        $customer = Customer::find($customerId);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

        // Generate kode OTP (6 digit)
        $otpCode = rand(100000, 999999);

        // Hapus OTP lama customer (jika ada)
        OtpCus::where('customer', $customer->id)->delete();

        // Simpan OTP baru
        $otp = OtpCus::create([
            'customer'   => $customer->id,
            'otp'        => $otpCode,
            'used'       => '0',
            'percobaan'  => '0',
            'create_at'  => now(),
            'expires_at' => now()->addMinutes(5),
            'status'     => '1',
        ]);

        // Format pesan WhatsApp (ambil nama dari table customer)
        $nama = $customer->nama ?? 'Kak';
        $message = "Halo {$nama},\n\nKode OTP kamu adalah *{$otpCode}*.\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapapun ya 😊";

        // Data untuk Quods API (format batch)
        $deviceKey = 'rCAIkWZDFOCosr3'; // device key kamu
        $token     = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');

        try {
            // Kirim ke Quods dengan format batch (JSON)
            $response = Http::withToken($token)
                ->asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://api.quods.id/api/message', [
                    'device_key' => $deviceKey,
                    'data' => [
                        [
                            'phone'   => $wa,
                            'message' => $message,
                        ]
                    ]
                ]);

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'OTP berhasil dikirim ke WhatsApp',
                    'data' => [
                        'otp_id' => $otp->id,
                        'customer' => [
                            'id' => $customer->id,
                            'nama' => $customer->nama,
                            'email' => $customer->email ?? null,
                            'phone' => $wa
                        ],
                        'otp' => $otpCode,
                        'wa_response' => $response->json(),
                    ]
                ], 200);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim pesan WhatsApp',
                    'error' => $response->json()
                ], $response->status());
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengirim OTP',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'otp' => 'required|string',
        ]);

        // Ambil customer_id dari authenticated user (jika sudah login)
        // Atau dari request body (jika belum login)
        $customerId = null;
        
        if (auth()->guard('customer')->check()) {
            // Jika sudah login, ambil dari authenticated user
            $customerId = auth()->guard('customer')->user()->id;
        } else {
            // Jika belum login, ambil dari request (backward compatibility)
            $request->validate([
                'customer_id' => 'required|integer',
            ]);
            $customerId = $request->customer_id;
        }

        $otpRecord = OtpCus::where('customer', $customerId)
            ->where('otp', $request->otp)
            ->where('status', '1')
            ->first();

        if (!$otpRecord) {
            return response()->json(['success' => false, 'message' => 'Kode OTP tidak valid'], 404);
        }

        if ($otpRecord->used == '1') {
            return response()->json(['success' => false, 'message' => 'OTP sudah digunakan'], 400);
        }

        // Check expiry
        if (Carbon::now()->greaterThan(Carbon::parse($otpRecord->expires_at))) {
            return response()->json(['success' => false, 'message' => 'OTP sudah kedaluwarsa'], 400);
        }
        
        // Tandai OTP sebagai digunakan
        $otpRecord->update([
            'used' => '1',
            'status' => '0'
        ]);

        $customer = Customer::find($customerId);
        if ($customer) {
            $customer->update(['verifikasi' => 1]);
        }
        
        return response()->json([
            'success' => true,
            'message' => 'OTP valid, akun telah diverifikasi',
            'data' => [
                'customer_id' => $customer->id ?? null,
                'nama' => $customer->nama ?? null,
                'verifikasi' => $customer->verifikasi ?? 1
            ]
        ]);
    }

    public function resendOtp(Request $request)
    {
        // Ambil customer_id dari authenticated user (jika sudah login)
        // Atau dari request body (jika belum login)
        $customerId = null;
        $phone = null;
        
        if (auth()->guard('customer')->check()) {
            // Jika sudah login, ambil dari authenticated user
            $customer = auth()->guard('customer')->user();
            $customerId = $customer->id;
            $phone = $customer->wa ?? $request->phone;
            
            if (!$phone) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WhatsApp tidak ditemukan. Silakan lengkapi profil Anda.'
                ], 400);
            }
        } else {
            // Jika belum login, validasi dan ambil dari request
            $request->validate([
                'customer' => 'required|integer|exists:customers,id',
                'phone' => 'required|string',
            ]);
            $customerId = $request->customer;
            $phone = $request->phone;
        }

        $customer = Customer::find($customerId);

        // Nonaktifkan OTP lama
        OtpCus::where('customer', $customer->id)
            ->where('status', '1')
            ->update(['status' => '0']);

        // Generate OTP baru
        $otp = rand(100000, 999999);

        $otpData = OtpCus::create([
            'customer' => $customer->id,
            'otp' => $otp,
            'used' => '0',
            'percobaan' => 0,
            'create_at' => now(),
            'expires_at' => now()->addMinutes(5),
            'status' => '1',
        ]);

        // Kirim via WhatsApp API (format batch)
        $deviceKey = 'rCAIkWZDFOCosr3';
        $token = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');

        $message = "Hai *{$customer->nama}*,\nKode OTP baru kamu adalah *{$otp}*.\nKode ini berlaku selama 5 menit.";

        $response = Http::withToken($token)
            ->asJson()
            ->withHeaders([
                'Content-Type' => 'application/json',
                'Accept' => 'application/json'
            ])
            ->post('https://api.quods.id/api/message', [
                'device_key' => $deviceKey,
                'data' => [
                    [
                        'phone'   => $phone,
                        'message' => $message,
                    ]
                ]
            ]);

        return response()->json([
            'success' => true,
            'message' => 'OTP baru berhasil dikirim',
            'otp_data' => $otpData,
            'whatsapp_response' => $response->json()
        ]);
    }
}