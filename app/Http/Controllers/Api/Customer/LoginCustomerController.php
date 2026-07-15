<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use App\Models\Customer;
use App\Models\OtpCus;
use App\Models\Sales;
use App\Jobs\SendWhatsAppJob;
use Carbon\Carbon;

class LoginCustomerController extends Controller
{
    /**
     * Backward compatibility: Login lama dengan email + password
     * POST /customer/login
     */
    public function __invoke(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'    => 'required|email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $customer = Customer::where('email', $request->email)->first();

        if (!$customer) {
            return response()->json(['success' => false, 'message' => 'Akun tidak ditemukan'], 404);
        }

        if ($customer->status === 'N') {
            return response()->json(['success' => false, 'message' => 'Akun belum aktif'], 403);
        }

        if (!$token = auth()->guard('customer')->attempt($request->only('email', 'password'))) {
            return response()->json(['success' => false, 'message' => 'Email atau password salah'], 401);
        }

        $userLogin = auth()->guard('customer')->user();
        $userLogin->update(['last_login_at' => now()]);

        $verifikasi = ($userLogin->tanggal_lahir == null) ? '0' : '1';

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'user'    => [
                'id'         => $userLogin->id,
                'nama'       => $userLogin->nama,
                'email'      => $userLogin->email,
                'wa'         => $userLogin->wa,
                'alamat'     => $userLogin->alamat,
                'verifikasi' => $verifikasi,
            ],
            'token' => $token,
        ]);
    }

    /**
     * Step 1: Cek apakah no_telp terdaftar & apakah sudah punya password
     * POST /customer/check-phone
     */
    public function checkPhone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'no_telp' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $phone = $this->formatPhoneNumber($request->no_telp);

        // Cari customer berdasarkan nomor WA
        $customer = Customer::where('wa', $phone)
            ->orWhere('wa', $request->no_telp)
            ->first();

        if (!$customer) {
            return response()->json([
                'success'     => false,
                'message'     => 'Nomor telepon tidak terdaftar. Pastikan Anda sudah melakukan order terlebih dahulu.',
                'has_account' => false,
            ], 404);
        }

        // Cek status aktif
        if ($customer->status === 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif.',
            ], 403);
        }

        // Cek apakah sudah punya password
        $hasPassword = !empty($customer->password);

        return response()->json([
            'success'      => true,
            'has_password' => $hasPassword,
            'customer_id'  => $customer->id,
            'nama'         => $customer->nama,
            'wa_masked'    => $this->maskPhone($phone),
            'message'      => $hasPassword
                ? 'Silakan masukkan password Anda'
                : 'Akun ditemukan. OTP akan dikirim ke WhatsApp Anda',
        ]);
    }

    /**
     * Step 2a (returning user): Login dengan no_telp + password
     * POST /customer/login-password
     */
    public function loginWithPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'no_telp'  => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $phone = $this->formatPhoneNumber($request->no_telp);

        $customer = Customer::where('wa', $phone)
            ->orWhere('wa', $request->no_telp)
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor telepon tidak terdaftar.',
            ], 404);
        }

        if ($customer->status === 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif.',
            ], 403);
        }

        // Verifikasi password
        if (!Hash::check($request->password, $customer->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Password salah. Silakan coba lagi.',
            ], 401);
        }

        // Generate JWT token
        $token = auth()->guard('customer')->login($customer);

        if (!$token) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat sesi login.',
            ], 500);
        }

        // Update last login
        $customer->update(['last_login_at' => now()]);

        $verifikasi = ($customer->tanggal_lahir == null) ? '0' : '1';

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil',
            'user'    => [
                'id'         => $customer->id,
                'nama'       => $customer->nama,
                'email'      => $customer->email,
                'wa'         => $customer->wa,
                'alamat'     => $customer->alamat,
                'verifikasi' => $verifikasi,
            ],
            'token'   => $token,
        ]);
    }

    /**
     * Step 2b (first-time / forgot): Kirim OTP ke no_telp
     * POST /customer/send-otp-by-phone
     */
    public function sendOtpByPhone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'no_telp' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $phone = $this->formatPhoneNumber($request->no_telp);

        $customer = Customer::where('wa', $phone)
            ->orWhere('wa', $request->no_telp)
            ->first();

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor telepon tidak terdaftar.',
            ], 404);
        }

        if ($customer->status === 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda tidak aktif.',
            ], 403);
        }

        // Generate kode OTP (6 digit)
        $otpCode = rand(100000, 999999);

        // Hapus OTP lama & simpan yang baru
        OtpCus::where('customer', $customer->id)->delete();
        OtpCus::create([
            'customer'   => $customer->id,
            'otp'        => $otpCode,
            'used'       => '0',
            'percobaan'  => '0',
            'create_at'  => now(),
            'expires_at' => now()->addMinutes(5),
            'status'     => '1',
        ]);

        // Format pesan
        $nama    = $customer->nama ?? 'Kak';
        $message = "Halo {$nama},\n\nKode OTP login kamu adalah *{$otpCode}*.\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapapun ya 😊";

        // Ambil woowa_key
        $woowaKey = $this->getWoowaKeyFromSales($customer);

        try {
            // Hit API via WhatsAppSenderService
            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $response = $waSender->sendMessage($phone, $message, null, $woowaKey, true);

            if (!$response->successful()) {
                throw new \Exception('Woowa API error: ' . $response->body());
            }

            return response()->json([
                'success'     => true,
                'message'     => 'OTP berhasil dikirim ke WhatsApp Anda',
                'customer_id' => $customer->id,
                'wa_masked'   => $this->maskPhone($phone),
            ]);
        } catch (\Exception $e) {
            logger()->error('Gagal mengirim OTP: ' . $e->getMessage() ." | Key: ".$woowaKey);
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim OTP. Silakan coba lagi.'
            ], 500);
        }
    }

    /**
     * Step 3: Verifikasi OTP + set password (first-time / reset)
     * POST /customer/verify-otp-set-password
     */
    public function verifyOtpAndSetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_id' => 'required|integer',
            'otp'         => 'required|string|size:6',
            'password'    => 'required|string|min:6|confirmed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors'  => $validator->errors(),
            ], 422);
        }

        $customer = Customer::find($request->customer_id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan.',
            ], 404);
        }

        // Cek OTP
        $otpRecord = OtpCus::where('customer', $customer->id)
            ->where('otp', $request->otp)
            ->where('status', '1')
            ->first();

        if (!$otpRecord) {
            return response()->json([
                'success' => false,
                'message' => 'Kode OTP tidak valid.',
            ], 400);
        }

        if ($otpRecord->used == '1') {
            return response()->json([
                'success' => false,
                'message' => 'OTP sudah digunakan.',
            ], 400);
        }

        if (Carbon::now()->greaterThan(Carbon::parse($otpRecord->expires_at))) {
            return response()->json([
                'success' => false,
                'message' => 'Kode OTP sudah kedaluwarsa.',
            ], 400);
        }

        // Tandai OTP digunakan
        $otpRecord->update(['used' => '1', 'status' => '0']);

        // Set / update password
        $customer->update([
            'password'   => Hash::make($request->password),
            'verifikasi' => 1,
        ]);

        // Generate JWT token untuk langsung login
        $token = auth()->guard('customer')->login($customer);

        $customer->update(['last_login_at' => now()]);

        $verifikasi = ($customer->tanggal_lahir == null) ? '0' : '1';

        return response()->json([
            'success' => true,
            'message' => 'Password berhasil diset. Login berhasil!',
            'user'    => [
                'id'         => $customer->id,
                'nama'       => $customer->nama,
                'email'      => $customer->email,
                'wa'         => $customer->wa,
                'alamat'     => $customer->alamat,
                'verifikasi' => $verifikasi,
            ],
            'token'   => $token,
        ]);
    }

    /**
     * Format nomor telepon ke format 62xxxxxxxxxx
     */
    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    /**
     * Mask nomor HP: 628xxx****1234
     */
    private function maskPhone($phone)
    {
        $len = strlen($phone);
        if ($len <= 6) return $phone;
        return substr($phone, 0, 4) . str_repeat('*', $len - 8) . substr($phone, -4);
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();

        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        return env('WOOWA_KEY');
    }
}
