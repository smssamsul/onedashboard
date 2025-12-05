<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ZoomService;
use App\Models\Webinar;
use App\Models\OrderCustomer;
use App\Models\Produk;
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

  
        $token = ZoomService::getAccessToken();

        
        $zoomResponse = Http::withToken($token)->post('https://api.zoom.us/v2/users/me/meetings', [
            'topic' => $request->topic,
            'type' => 2, // scheduled meeting
            'start_time' => date('Y-m-d\TH:i:s', strtotime($request->start_time)),
            'duration' => $request->duration,
            'timezone' => 'Asia/Jakarta',
            'settings' => [
                'join_before_host' => $request->input('join_before_host', true),
                'host_video' => $request->input('host_video', true),
                'participant_video' => $request->input('participant_video', true),
                'mute_upon_entry' => $request->input('mute_upon_entry', true),
                'waiting_room' => $request->input('waiting_room', true),
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
            'sesi' => $request->sesi,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Webinar berhasil dibuat',
            'data' => $webinar,
        ]);
    }

    public function update(Request $request, $id)
    {
        $webinar = Webinar::findOrFail($id);

        $request->validate([
            'topic' => 'nullable|string',
            'start_time' => 'nullable|date',
            'duration' => 'nullable|integer|min:15|max:300',
            'waiting_room' => 'nullable|boolean',
            'host_video' => 'nullable|boolean',
            'participant_video' => 'nullable|boolean',
            'mute_upon_entry' => 'nullable|boolean',
            'join_before_host' => 'nullable|boolean',
        ]);

    
        $token = ZoomService::getAccessToken();

     
        $updateData = [];

        if ($request->has('topic')) {
            $updateData['topic'] = $request->topic;
        }

        if ($request->has('start_time')) {
            $updateData['start_time'] = date('Y-m-d\TH:i:s', strtotime($request->start_time));
        }

        if ($request->has('duration')) {
            $updateData['duration'] = $request->duration;
        }

 
        if ($request->hasAny(['waiting_room', 'host_video', 'participant_video', 'mute_upon_entry', 'join_before_host'])) {
            $updateData['settings'] = [];

            if ($request->has('waiting_room')) {
                $updateData['settings']['waiting_room'] = $request->waiting_room;
            }

            if ($request->has('host_video')) {
                $updateData['settings']['host_video'] = $request->host_video;
            }

            if ($request->has('participant_video')) {
                $updateData['settings']['participant_video'] = $request->participant_video;
            }

            if ($request->has('mute_upon_entry')) {
                $updateData['settings']['mute_upon_entry'] = $request->mute_upon_entry;
            }

            if ($request->has('join_before_host')) {
                $updateData['settings']['join_before_host'] = $request->join_before_host;
            }
        }

        $zoomResponse = Http::withToken($token)
            ->patch("https://api.zoom.us/v2/meetings/{$webinar->meeting_id}", $updateData);

        if ($zoomResponse->failed()) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengupdate meeting di Zoom',
                'error' => $zoomResponse->json(),
            ], 500);
        }

        $zoomData = $zoomResponse->json();

        $updateWebinar = [];

        if ($request->has('start_time')) {
            $updateWebinar['start_time'] = $request->start_time;
        }

        if ($request->has('duration')) {
            $updateWebinar['duration'] = $request->duration;
        }

        if (isset($zoomData['join_url'])) {
            $updateWebinar['join_url'] = $zoomData['join_url'];
        }

        if (isset($zoomData['start_url'])) {
            $updateWebinar['start_url'] = $zoomData['start_url'];
        }

        if (isset($zoomData['password'])) {
            $updateWebinar['password'] = $zoomData['password'];
        }

        if (!empty($updateWebinar)) {
            $webinar->update($updateWebinar);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webinar berhasil diupdate',
            'data' => $webinar->fresh(),
        ]);
    }


    public function index($produkId)
    {
        $produk = Produk::find($produkId);
        
        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        $webinars = Webinar::with('produk:id,nama,kode')
            ->where('produk', $produkId)
            ->orderBy('create_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data webinar berhasil diambil',
            'produk' => [
                'id' => $produk->id,
                'nama' => $produk->nama,
                'kode' => $produk->kode
            ],
            'total' => $webinars->count(),
            'data' => $webinars
        ]);
    }


    public function joinFromOrder(Request $request, $orderId)
    {
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

            }
        }

        if ($order->status_order != '2') {
            return response()->json([
                'success' => false,
                'message' => 'Order belum dibayar'
            ], 403);
        }

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

        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');
        $meetingNumber = $webinar->meeting_id;

        $iat = time() - 30;
        $exp = $iat + (60 * 60 * 2);
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
