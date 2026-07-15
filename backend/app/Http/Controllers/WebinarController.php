<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use App\Models\Webinar;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Auth;

class WebinarController extends Controller
{
    public function join($id)
    {
        $webinar = Webinar::findOrFail($id);

        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');
        $meetingNumber = $webinar->meeting_id;

        $iat = time() - 30; // waktu dibuat
        $exp = $iat + (60 * 60 * 2); // berlaku 2 jam

        $payload = [
            'sdkKey'   => $sdkKey,
            'appKey'   => $sdkKey, // ⚠️ wajib di SDK v4.x
            'mn'       => $meetingNumber,
            'role'     => 0, // 0 = peserta
            'iat'      => $iat,
            'exp'      => $exp,
            'tokenExp' => $exp,
        ];

        // langsung encode JWT tanpa base64 tambahan
        $signature = JWT::encode($payload, $sdkSecret, 'HS256');

        return view('webinar.join', [
            'meetingNumber' => $meetingNumber,
            'password'      => $webinar->password,
            'signature'     => $signature,
            'sdkKey'        => $sdkKey,
        ]);
    }

    public function join2($id)
    {
        // Contoh data meeting (nanti bisa dari database)
        $meetingNumber = '123456789'; // Ganti dengan meeting number kamu
        $password = '123456'; // Password meeting Zoom

        // Zoom SDK Credentials
        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');

        // Generate signature
        $role = 0; // 0 = peserta, 1 = host
        $signature = $this->generateSignature($sdkKey, $sdkSecret, $meetingNumber, $role);

        return view('webinar.join2', compact(
            'meetingNumber',
            'password',
            'sdkKey',
            'signature'
        ));
    }

    private function generateSignature($sdkKey, $sdkSecret, $meetingNumber, $role)
    {
        $iat = time();
        $exp = $iat + 60 * 60 * 2; // Berlaku 2 jam
        $payload = [
            'sdkKey' => $sdkKey,
            'mn' => $meetingNumber,
            'role' => $role,
            'iat' => $iat,
            'exp' => $exp,
            'appKey' => $sdkKey,
            'tokenExp' => $exp,
        ];

        return JWT::encode($payload, $sdkSecret, 'HS256');
    }

    /**
     * Join webinar dari order customer
     */
    public function joinFromOrder(Request $request, $orderId)
    {
        // Ambil order dengan relasi produk dan webinar
        $order = OrderCustomer::with([
            'produk_rel' => function($query) {
                $query->with('webinar');
            },
            'customer_rel'
        ])->findOrFail($orderId);

        // Verifikasi token dari request (bisa dari header atau query parameter)
        $token = $request->header('Authorization') 
            ? str_replace('Bearer ', '', $request->header('Authorization'))
            : ($request->query('token') ?? null);

        // Jika ada token, verifikasi customer
        if ($token) {
            try {
                auth('customer')->setToken($token);
                $customer = auth('customer')->user();
                
                if (!$customer || $order->customer != $customer->id) {
                    abort(403, 'Unauthorized access to this order');
                }
            } catch (\Exception $e) {
                // Token tidak valid, lanjutkan dengan verifikasi order saja
                // (akan dicek di frontend juga)
            }
        }

        // Verifikasi bahwa order sudah dibayar
        if ($order->status_order != '2') {
            abort(403, 'Order belum dibayar');
        }

        // Ambil webinar dari produk
        $produk = $order->produk_rel;
        if (!$produk) {
            abort(404, 'Produk tidak ditemukan');
        }

        $webinar = $produk->webinar;
        if (!$webinar) {
            abort(404, 'Webinar tidak ditemukan untuk produk ini');
        }

        // Generate signature untuk Zoom SDK
        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');
        $meetingNumber = $webinar->meeting_id;

        $iat = time() - 30;
        $exp = $iat + (60 * 60 * 2); // berlaku 2 jam

        $payload = [
            'sdkKey'   => $sdkKey,
            'appKey'   => $sdkKey,
            'mn'       => $meetingNumber,
            'role'     => 0, // 0 = peserta
            'iat'      => $iat,
            'exp'      => $exp,
            'tokenExp' => $exp,
        ];

        $signature = JWT::encode($payload, $sdkSecret, 'HS256');

        // Ambil nama customer
        $userName = $order->customer_rel->nama_panggilan ?? $order->customer_rel->nama ?? 'Peserta Webinar';
        $userEmail = $order->customer_rel->email ?? 'guest@example.com';

        return view('join', [
            'meetingNumber' => $meetingNumber,
            'password'      => $webinar->password,
            'signature'     => $signature,
            'sdkKey'        => $sdkKey,
            'userName'      => $userName,
            'userEmail'     => $userEmail,
            'produkNama'    => $produk->nama,
            'orderId'       => $order->id,
        ]);
    }
}