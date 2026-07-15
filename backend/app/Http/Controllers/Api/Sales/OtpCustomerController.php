<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use App\Models\OtpCus;
use App\Models\Customer;
use App\Models\Sales;
use App\Jobs\SendWhatsAppJob;

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

        // Ambil woowa_key dari sales yang terkait dengan customer
        $woowaKey = $this->getWoowaKeyFromSales($customer);

        try {
            // Kirim via RabbitMQ Queue (asynchronous)
            SendWhatsAppJob::dispatch($wa, $message, $woowaKey);

            return response()->json([
                'success' => true,
                'message' => 'OTP berhasil dikirim ke WhatsApp (via Queue)',
                'data' => [
                    'otp_id' => $otp->id,
                    'customer' => [
                        'id' => $customer->id,
                        'nama' => $customer->nama,
                        'email' => $customer->email ?? null,
                        'phone' => $wa
                    ],
                    'otp' => $otpCode,
                    'queue' => 'dispatched',
                ]
            ], 200);

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
                'customer_id' => 'required|integer|exists:customer,id',
                'wa' => 'required|string',
            ]);
            $customerId = $request->customer_id;
            $phone = $request->wa;
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

        // Ambil woowa_key dari sales yang terkait dengan customer
        $woowaKey = $this->getWoowaKeyFromSales($customer);

        $message = "Hai *{$customer->nama}*,\nKode OTP baru kamu adalah *{$otp}*.\nKode ini berlaku selama 5 menit.";

        try {
            // Kirim via RabbitMQ Queue (asynchronous)
            SendWhatsAppJob::dispatch($phone, $message, $woowaKey);

            return response()->json([
                'success' => true,
                'message' => 'OTP baru berhasil dikirim (via Queue)',
                'otp_data' => $otpData,
                'queue' => 'dispatched'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengirim OTP',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updatePhoneAndSendOtp(Request $request)
    {
        // Validasi request
        $request->validate([
            'wa' => 'required|string',
        ]);

        // Ambil customer_id dari authenticated user (jika sudah login)
        // Atau dari request body (jika belum login)
        $customerId = null;
        
        if (auth()->guard('customer')->check()) {
            // Jika sudah login, ambil dari authenticated user
            $customerId = auth()->guard('customer')->user()->id;
        } else {
            // Jika belum login, ambil dari request
            $request->validate([
                'customer_id' => 'required|integer',
            ]);
            $customerId = $request->customer_id;
        }

        // Ambil data customer
        $customer = Customer::find($customerId);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

        // Format nomor telepon
        $newPhone = $this->formatPhoneNumber($request->wa);

        // Update nomor customer
        $customer->update([
            'wa' => $newPhone,
            'update_at' => now()
        ]);

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

        // Format pesan WhatsApp
        $nama = $customer->nama ?? 'Kak';
        $message = "Halo {$nama},\n\nNomor WhatsApp Anda telah diubah.\n\nKode OTP verifikasi kamu adalah *{$otpCode}*.\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapapun ya 😊";

        // Ambil woowa_key dari sales yang terkait dengan customer
        $woowaKey = $this->getWoowaKeyFromSales($customer);

        try {
            // Kirim via RabbitMQ Queue (asynchronous)
            SendWhatsAppJob::dispatch($newPhone, $message, $woowaKey);

            return response()->json([
                'success' => true,
                'message' => 'Nomor WhatsApp berhasil diubah dan OTP berhasil dikirim (via Queue)',
                'data' => [
                    'customer' => [
                        'id' => $customer->id,
                        'nama' => $customer->nama,
                        'email' => $customer->email ?? null,
                        'phone' => $newPhone,
                        'phone_old' => $request->wa_old ?? null
                    ],
                    'otp_id' => $otp->id,
                    'otp' => $otpCode,
                    'queue' => 'dispatched',
                ]
            ], 200);

        } catch (\Exception $e) {
            // Jika gagal dispatch job, tetap update nomor sudah berhasil
            return response()->json([
                'success' => false,
                'message' => 'Nomor WhatsApp berhasil diubah, namun terjadi kesalahan saat mengirim OTP',
                'data' => [
                    'customer' => [
                        'id' => $customer->id,
                        'nama' => $customer->nama,
                        'phone' => $newPhone
                    ]
                ],
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     * Jika tidak ditemukan, fallback ke SalesSetting::getWoowaUtama()
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return \App\Models\SalesSetting::getWoowaUtama();
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();
        
        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        // Fallback ke SalesSetting::getWoowaUtama() jika tidak ditemukan
        return \App\Models\SalesSetting::getWoowaUtama();
    }
}