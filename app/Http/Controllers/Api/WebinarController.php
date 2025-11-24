<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ZoomService;
use App\Models\Webinar;
use App\Models\OrderCustomer;
use Firebase\JWT\JWT;

class WebinarController extends Controller
{
    /**
     * Membuat webinar baru (otomatis buat meeting Zoom)
     */
    public function store(Request $request)
    {
        $request->validate([
            'produk' => 'required|exists:produk,id',
            'topic' => 'required|string',
            'start_time' => 'required|date',
            'duration' => 'required|integer|min:15|max:300',
            'waiting_room' => 'nullable|boolean',
        ]);

        // 🔐 Ambil token dari Zoom
        $token = ZoomService::getAccessToken();

        // 📤 Kirim request buat meeting ke Zoom
        $zoomResponse = Http::withToken($token)->post('https://api.zoom.us/v2/users/me/meetings', [
            'topic' => $request->topic,
            'type' => 2, // scheduled meeting
            'start_time' => date('Y-m-d\TH:i:s', strtotime($request->start_time)),
            'duration' => $request->duration,
            'timezone' => 'Asia/Jakarta',
            'settings' => [
                'join_before_host' => true,
                'host_video' => true,
                'participant_video' => true,
                'mute_upon_entry' => true,
                'waiting_room' => $request->input('waiting_room', false),
            ],
        ]);

        if ($zoomResponse->failed()) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat meeting di Zoom',
                'error' => $zoomResponse->json(),
            ], 500);
        }

        $data = $zoomResponse->json();

        // 💾 Simpan ke tabel webinar
        $webinar = Webinar::create([
            'produk' => $request->produk,
            'meeting_id' => $data['id'],
            'join_url' => $data['join_url'],
            'start_url' => $data['start_url'],
            'password' => $data['password'] ?? null,
            'start_time' => $request->start_time,
            'duration' => $request->duration,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Webinar berhasil dibuat',
            'data' => $webinar,
        ]);
    }

    /**
     * Menampilkan semua webinar
     */
    public function index()
    {
        $webinars = Webinar::with('produk')->latest()->get();
        return response()->json([
            'success' => true,
            'data' => $webinars
        ]);
    }

    /**
     * Join webinar dari order customer (API endpoint)
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
                    return response()->json([
                        'success' => false,
                        'message' => 'Unauthorized access to this order'
                    ], 403);
                }
            } catch (\Exception $e) {
                // Token tidak valid, lanjutkan dengan verifikasi order saja
                // (akan dicek di frontend juga)
            }
        }

        // Verifikasi bahwa order sudah dibayar
        if ($order->status_order != '2') {
            return response()->json([
                'success' => false,
                'message' => 'Order belum dibayar'
            ], 403);
        }

        // Ambil webinar dari produk
        $produk = $order->produk_rel;
        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        $webinar = $produk->webinar;
        if (!$webinar) {
            return response()->json([
                'success' => false,
                'message' => 'Webinar tidak ditemukan untuk produk ini'
            ], 404);
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

        return response()->json([
            'success' => true,
            'data' => [
                'meetingNumber' => $meetingNumber,
                'password'      => $webinar->password,
                'signature'     => $signature,
                'sdkKey'        => $sdkKey,
                'userName'      => $userName,
                'userEmail'     => $userEmail,
                'produkNama'    => $produk->nama,
                'orderId'       => $order->id,
                'webinar'       => [
                    'id' => $webinar->id,
                    'meeting_id' => $webinar->meeting_id,
                    'join_url' => $webinar->join_url,
                    'start_time' => $webinar->start_time,
                    'duration' => $webinar->duration,
                ]
            ]
        ]);
    }
}
