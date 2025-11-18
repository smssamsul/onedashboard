<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\ZoomService;
use App\Models\Webinar;

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
                'waiting_room' => false,
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
}
