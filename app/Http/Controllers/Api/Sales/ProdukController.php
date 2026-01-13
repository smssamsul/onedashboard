<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produk;
use App\Models\Webinar;
use App\Models\ProdukBundling;
use App\Services\ZoomService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class ProdukController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api')->except(['showByKode']);;
    }

    /**
     * Process landingpage components and upload images
     */
    private function processLandingPage($landingpage, $produkId = null)
    {
        if (empty($landingpage)) {
            return null;
        }

        // Jika landingpage adalah string JSON, decode dulu
        if (is_string($landingpage)) {
            $landingpage = json_decode($landingpage, true);
        }

        if (!is_array($landingpage)) {
            return is_string($landingpage) ? $landingpage : json_encode($landingpage);
        }

        $request = request();

        foreach ($landingpage as &$component) {
            if (!isset($component['type'])) {
                continue;
            }

            $type = $component['type'];
            $componentId = $component['config']['componentId'] ?? null;

            // Process image component
            if ($type === 'image' && isset($component['content'])) {
                // Cek apakah ada file upload untuk image ini
                $fileKey = $componentId ? "landingpage_image_{$componentId}" : null;
                
                // Jika src adalah URL atau path yang sudah ada, skip
                if (isset($component['content']['src']) && 
                    (strpos($component['content']['src'], 'http') === 0 || 
                     strpos($component['content']['src'], '/storage/') === 0)) {
                    continue;
                }

                if ($fileKey && $request->hasFile($fileKey)) {
                    $file = $request->file($fileKey);
                    if ($file && $file->isValid()) {
                        $path = $file->store("produk/landingpage/{$produkId}/images", 'public');
                        $component['content']['src'] = $path;
                    }
                }
            }

            // Process image-slider component
            if ($type === 'image-slider' && isset($component['content']['images']) && is_array($component['content']['images'])) {
                foreach ($component['content']['images'] as $idx => &$image) {
                    // Jika src adalah URL atau path yang sudah ada, skip
                    if (isset($image['src']) && 
                        (strpos($image['src'], 'http') === 0 || 
                         strpos($image['src'], '/storage/') === 0)) {
                        continue;
                    }

                    $fileKey = $componentId ? "landingpage_slider_{$componentId}_{$idx}" : null;
                    if ($fileKey && $request->hasFile($fileKey)) {
                        $file = $request->file($fileKey);
                        if ($file && $file->isValid()) {
                            $path = $file->store("produk/landingpage/{$produkId}/slider", 'public');
                            $image['src'] = $path;
                        }
                    }
                }
            }

            // Process testimoni component
            if ($type === 'testimoni' && isset($component['content']['items']) && is_array($component['content']['items'])) {
                foreach ($component['content']['items'] as $idx => &$testi) {
                    // Jika gambar adalah URL atau path yang sudah ada, skip
                    if (isset($testi['gambar']) && 
                        (strpos($testi['gambar'], 'http') === 0 || 
                         strpos($testi['gambar'], '/storage/') === 0)) {
                        continue;
                    }

                    $fileKey = $componentId ? "landingpage_testimoni_{$componentId}_{$idx}" : null;
                    if ($fileKey && $request->hasFile($fileKey)) {
                        $file = $request->file($fileKey);
                        if ($file && $file->isValid()) {
                            $path = $file->store("produk/landingpage/{$produkId}/testimoni", 'public');
                            $testi['gambar'] = $path;
                        }
                    }
                }
            }
        }

        return json_encode($landingpage);
    }
  
    public function index()
    {


        $query = Produk::with([
            'kategori_rel:id,nama',
            'user_rel:id,nama',
            'trainer_rel:id,nama'
        ])
        ->where('status', '!=', 'N') 
        ->orderBy('create_at', 'desc');

        $produk = $query->orderBy('create_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $produk
        ]);
    }

  
    public function store(Request $request)
    {

        $jsonFields = [
            'assign',
            'custom_field',
            'list_point',
            'testimoni',
            'fb_pixel',
            'event_fb_pixel',
            'gtm',
            'video',
            'bundling',
            'landingpage',
        ];

        foreach ($jsonFields as $field) {
            if ($request->has($field) && is_string($request->$field)) {
                $decoded = json_decode($request->$field, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }


        $request->validate([
            'kategori' => 'required|integer',
            'nama' => 'required|string|max:255',
            'kode' => 'required|string|max:255|unique:produk,kode',
            'url' => 'nullable|string|max:255',
            'harga' => 'nullable|string',
            'jenis_produk' => 'nullable|string|max:20',
            'isBundling' => 'nullable|boolean',
            'bundling' => 'nullable|array',
            'tanggal_event' => 'nullable|date',
            'assign' => 'nullable|array',
            'status' => 'nullable|string',
            'landingpage' => 'nullable|array',
            'header' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.caption' => 'nullable|string',
            'custom_field' => 'nullable|array',
            'custom_field.*.nama_field' => 'required_with:custom_field|string',
            'custom_field.*.urutan' => 'nullable|integer',
            'list_point' => 'nullable|array',
            'list_point.*.nama' => 'required_with:list_point|string',
            'list_point.*.urutan' => 'nullable|integer',
            'testimoni' => 'nullable|array',
            'testimoni.*.gambar' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'testimoni.*.nama' => 'nullable|string',
            'testimoni.*.deskripsi' => 'nullable|string',
            'fb_pixel' => 'nullable|array',
            'event_fb_pixel' => 'nullable|array',
            'gtm' => 'nullable|array',
            'video' => 'nullable|array',
            'video.*' => 'nullable|string'
        ]);


        // Handle header image (optional now)
        $headerPath = null;
        if ($request->hasFile('header')) {
            $headerPath = $request->file('header')->store('produk/header', 'public');
        }

        $gambarArray = [];
        if ($request->has('gambar')) {
            foreach ($request->gambar as $img) {
                if (isset($img['file'])) {
                    $path = $img['file']->store('produk/gallery', 'public');
                    $gambarArray[] = [
                        'path' => $path,
                        'caption' => $img['caption'] ?? ''
                    ];
                }
            }
        }

        $testimoniArray = [];
        if ($request->has('testimoni')) {
            foreach ($request->testimoni as $testi) {
                $gambarPath = null;
                if (isset($testi['gambar'])) {
                    $gambarPath = $testi['gambar']->store('produk/testimoni', 'public');
                }
                $testimoniArray[] = [
                    'gambar' => $gambarPath,
                    'nama' => $testi['nama'] ?? '',
                    'deskripsi' => $testi['deskripsi'] ?? ''
                ];
            }
        }

        // Process bundling - tidak lagi disimpan di field bundling, tapi di table produk_bundling
        // $bundlingData akan tetap null karena tidak disimpan di field bundling
        $bundlingData = null;

        // Parse tanggal_event dari ISO format jika perlu
        $tanggalEvent = null;
        if ($request->has('tanggal_event') && $request->tanggal_event) {
            try {
                // Coba parse dari ISO format (2024-12-15T09:00:00.000Z)
                $tanggalEvent = \Carbon\Carbon::parse($request->tanggal_event)->format('Y-m-d');
            } catch (\Exception $e) {
                // Jika gagal, gunakan value asli
                $tanggalEvent = $request->tanggal_event;
            }
        }

        // Create produk dulu untuk mendapatkan ID (diperlukan untuk upload image dari landingpage)
        $produk = Produk::create([
            'kategori' => $request->kategori,
            'user_input' => auth()->user()->user,
            'kode' => $request->kode,
            'nama' => $request->nama,
            'url' => $request->url,
            'header' => $headerPath,
            'harga_coret' => $request->harga_coret,
            'harga_asli' => $request->harga ?? $request->harga_asli,
            'jenis_produk' => $request->jenis_produk ?? 'non-fisik',
            'bundling' => null, // Tidak lagi menyimpan bundling di field ini
            'deskripsi' => $request->deskripsi,
            'tanggal_event' => $tanggalEvent,
            'gambar' => json_encode($gambarArray),
            'lainnya' => $request->lainnya,
            'trainer' => $request->trainer,
            'create_at' => now(),
            'status' => $request->status ?? '1',
            'assign' => json_encode($request->assign ?? []),
            'custom_field' => json_encode($request->custom_field ?? []),
            'list_point' => json_encode($request->list_point ?? []),
            'testimoni' => json_encode($testimoniArray),
            'fb_pixel' => json_encode($request->fb_pixel ?? []),
            'event_fb_pixel' => json_encode($request->event_fb_pixel ?? []),
            'gtm' => json_encode($request->gtm ?? []),
            'video' => json_encode($request->video ?? []),
        ]);

        // Process landingpage dengan upload images (setelah produk dibuat untuk mendapatkan ID)
        if ($request->has('landingpage')) {
            $landingpageData = $this->processLandingPage($request->landingpage, $produk->id);
            $produk->landingpage = $landingpageData;
            $produk->save();
        }

        // Process bundling - simpan ke table produk_bundling
        if ($request->has('bundling') && is_array($request->bundling)) {
            foreach ($request->bundling as $bundlingItem) {
                if (isset($bundlingItem['nama']) && isset($bundlingItem['harga'])) {
                    ProdukBundling::create([
                        'produk' => $produk->id,
                        'nama' => $bundlingItem['nama'],
                        'harga' => $bundlingItem['harga'],
                        'status' => $bundlingItem['status'] ?? 'A', // Default 'A' jika tidak ada
                    ]);
                }
            }
        }

        // Input ke Zoom hanya jika kategori produk adalah 2
        if($produk && $produk->kategori == 2){
            $token = ZoomService::getAccessToken();

        
            $zoomResponse = Http::withToken($token)->post('https://api.zoom.us/v2/users/me/meetings', [
                'topic' => $request->topic,
                'type' => 2, // scheduled meeting
                'start_time' => date('Y-m-d\TH:i:s', strtotime($request->start_time)),
                'duration' => 60,
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

            $webinar = Webinar::create([
                'produk' => $request->produk,
                'meeting_id' => $data['id'],
                'join_url' => $data['join_url'],
                'start_url' => $data['start_url'],
                'password' => $data['password'] ?? null,
                'start_time' => $request->start_time,
                'duration' => $request->duration,
                ]);
        }
        

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dibuat',
            'data' => $produk
        ]);
    }

    public function show($id)
    {

        $query = Produk::with([
            'kategori_rel:id,nama',
            'user_rel:id,nama',
            'trainer_rel:id,nama'
        ])
        ->where('status', '!=', 'N') 
        ->where('id', $id)
        ->orderBy('create_at', 'desc');

        $produk = $query->orderBy('create_at', 'desc')->first();

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $produk
        ]);
    }

   public function update(Request $request, $id)
    {
        $produk = Produk::find($id);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        // Decode JSON string ke array (agar form-data JSON string tetap terbaca)
        $jsonFields = [
            'assign',
            'custom_field',
            'list_point',
            'testimoni',
            'fb_pixel',
            'event_fb_pixel',
            'gtm',
            'video',
            'bundling',
            'landingpage',
        ];

        foreach ($jsonFields as $field) {
            if ($request->has($field) && is_string($request->$field)) {
                $decoded = json_decode($request->$field, true);
                if (json_last_error() === JSON_ERROR_NONE) {
                    $request->merge([$field => $decoded]);
                }
            }
        }

        // Validasi data
        $request->validate([
            'kategori' => 'nullable|integer',
            'nama' => 'nullable|string|max:255',
            'kode' => 'nullable|string|max:255|unique:produk,kode,' . $id,
            'url' => 'nullable|string|max:255',
            'harga' => 'nullable|string',
            'jenis_produk' => 'nullable|string|max:20',
            'isBundling' => 'nullable|boolean',
            'bundling' => 'nullable|array',
            'tanggal_event' => 'nullable',
            'landingpage' => 'nullable|array',
            'header' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.caption' => 'nullable|string',
            'assign' => 'nullable|array',
            'custom_field' => 'nullable|array',
            'custom_field.*.nama_field' => 'required_with:custom_field|string',
            'custom_field.*.urutan' => 'nullable|integer',
            'list_point' => 'nullable|array',
            'list_point.*.nama' => 'required_with:list_point|string',
            'list_point.*.urutan' => 'nullable|integer',
            'testimoni' => 'nullable|array',
            'testimoni.*.gambar' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'testimoni.*.nama' => 'nullable|string',
            'testimoni.*.deskripsi' => 'nullable|string',
            'fb_pixel' => 'nullable|array',
            'event_fb_pixel' => 'nullable|array',
            'gtm' => 'nullable|array',
            'video' => 'nullable|array',
            'video.*' => 'nullable|string'
        ]);

        // Update header (hapus lama jika ada file baru)
        if ($request->hasFile('header')) {
            if ($produk->header && Storage::disk('public')->exists($produk->header)) {
                Storage::disk('public')->delete($produk->header);
            }
            $produk->header = $request->file('header')->store('produk/header', 'public');
        }

        // Tambah gambar baru ke gallery
        $gambarArray = json_decode($produk->gambar ?? '[]', true);
        if ($request->has('gambar')) {
            foreach ($request->gambar as $img) {
                if (isset($img['file'])) {
                    $path = $img['file']->store('produk/gallery', 'public');
                    $gambarArray[] = [
                        'path' => $path,
                        'caption' => $img['caption'] ?? ''
                    ];
                }
            }
            $produk->gambar = json_encode($gambarArray);
        }

        // Update testimoni (upload gambar jika ada)
        $testimoniArray = json_decode($produk->testimoni ?? '[]', true);
        if ($request->has('testimoni')) {
            foreach ($request->testimoni as $testi) {
                $gambarPath = null;
                if (isset($testi['gambar'])) {
                    $gambarPath = $testi['gambar']->store('produk/testimoni', 'public');
                }
                $testimoniArray[] = [
                    'gambar' => $gambarPath,
                    'nama' => $testi['nama'] ?? '',
                    'deskripsi' => $testi['deskripsi'] ?? ''
                ];
            }
        }

        // Process bundling - tidak lagi disimpan di field bundling, tapi di table produk_bundling
        // Hapus bundling lama jika ada bundling baru
        if ($request->has('bundling')) {
            ProdukBundling::where('produk', $id)->delete();
        }

        // Parse tanggal_event dari ISO format jika perlu
        $tanggalEvent = $produk->tanggal_event;
        if ($request->has('tanggal_event') && $request->tanggal_event) {
            try {
                $tanggalEvent = \Carbon\Carbon::parse($request->tanggal_event)->format('Y-m-d');
            } catch (\Exception $e) {
                $tanggalEvent = $request->tanggal_event;
            }
        }

        // Process landingpage dengan upload images
        $landingpageData = null;
        if ($request->has('landingpage')) {
            $landingpageData = $this->processLandingPage($request->landingpage, $produk->id);
        } else {
            // Jika tidak ada update, gunakan data lama (pastikan format JSON string)
            $oldLandingpage = $produk->landingpage;
            $landingpageData = is_string($oldLandingpage) ? $oldLandingpage : json_encode($oldLandingpage);
        }

        // Update semua kolom
        $produk->update([
            'kategori' => $request->kategori ?? $produk->kategori,
            'nama' => $request->nama ?? $produk->nama,
            'kode' => $request->kode ?? $produk->kode,
            'url' => $request->url ?? $produk->url,
            'harga_coret' => $request->harga_coret ?? $produk->harga_coret,
            'harga_asli' => $request->harga ?? $request->harga_asli ?? $produk->harga_asli,
            'jenis_produk' => $request->jenis_produk ?? $produk->jenis_produk,
            'bundling' => null, // Tidak lagi menyimpan bundling di field ini
            'deskripsi' => $request->deskripsi ?? $produk->deskripsi,
            'tanggal_event' => $tanggalEvent,
            'landingpage' => $landingpageData,
            'update_at' => now(),

            // Field tambahan (disimpan sebagai JSON)
            'assign' => json_encode($request->assign ?? json_decode($produk->assign, true) ?? []),
            'custom_field' => json_encode($request->custom_field ?? json_decode($produk->custom_field, true) ?? []),
            'list_point' => json_encode($request->list_point ?? json_decode($produk->list_point, true) ?? []),
            'testimoni' => json_encode($testimoniArray),
            'fb_pixel' => json_encode($request->fb_pixel ?? json_decode($produk->fb_pixel, true) ?? []),
            'event_fb_pixel' => json_encode($request->event_fb_pixel ?? json_decode($produk->event_fb_pixel, true) ?? []),
            'gtm' => json_encode($request->gtm ?? json_decode($produk->gtm, true) ?? []),
            'video' => json_encode($request->video ?? json_decode($produk->video, true) ?? []),
        ]);

        // Process bundling - simpan ke table produk_bundling
        if ($request->has('bundling') && is_array($request->bundling)) {
            foreach ($request->bundling as $bundlingItem) {
                if (isset($bundlingItem['nama']) && isset($bundlingItem['harga'])) {
                    ProdukBundling::create([
                        'produk' => $produk->id,
                        'nama' => $bundlingItem['nama'],
                        'harga' => $bundlingItem['harga'],
                        'status' => $bundlingItem['status'] ?? 'A', // Default 'A' jika tidak ada
                    ]);
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui',
            'data' => $produk
        ]);
    }


    public function destroy($id)
    {
        $produk = Produk::find($id);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }


        $produk->update([
            'status'    => "2"
        ]);

        // Hapus header
        // if ($produk->header && Storage::disk('public')->exists($produk->header)) {
        //     Storage::disk('public')->delete($produk->header);
        // }

        // Hapus semua gambar
        // $gambarArray = json_decode($produk->gambar ?? '[]', true);
        // foreach ($gambarArray as $g) {
        //     if (isset($g['path']) && Storage::disk('public')->exists($g['path'])) {
        //         Storage::disk('public')->delete($g['path']);
        //     }
        // }

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus'
        ]);
    }

    public function deleteImage($id, $index)
    {
        $produk = Produk::findOrFail($id);
        $gambarData = json_decode($produk->gambar ?? '[]', true);

        if (!isset($gambarData[$index])) {
            return response()->json(['message' => 'Gambar tidak ditemukan'], 404);
        }

        Storage::disk('public')->delete($gambarData[$index]['path']);

        array_splice($gambarData, $index, 1);
        $produk->gambar = json_encode($gambarData);
        $produk->save();

        return response()->json(['message' => 'Gambar berhasil dihapus', 'data' => $produk]);
    }

    public function deleteTestimoni($id, $index)
    {
        $produk = Produk::findOrFail($id);
        $testimoniData = json_decode($produk->testimoni ?? '[]', true);

        if (!isset($testimoniData[$index])) {
            return response()->json(['message' => 'Testimoni tidak ditemukan'], 404);
        }

        if (!empty($testimoniData[$index]['gambar']) && Storage::disk('public')->exists($testimoniData[$index]['gambar'])) {
            Storage::disk('public')->delete($testimoniData[$index]['gambar']);
        }

        array_splice($testimoniData, $index, 1);
        $produk->testimoni = json_encode($testimoniData);
        $produk->save();

        return response()->json([
            'success' => true,
            'message' => 'Testimoni berhasil dihapus',
            'data' => $produk
        ]);
    }


    public function showByKode($kode)
    {
        $produk = Produk::where('kode', $kode)
            ->with(['kategori_rel:id,nama', 'user_rel:id,nama'])
            ->first();

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $produk,
            'landing_url' => url("/{$produk->kode}")
        ]);
    }

    public function updateTrainer(Request $request, $id)
    {
        // Cari produk
        $produk = Produk::find($id);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        // Validasi trainer (harus user yang ada di tabel user)
        $request->validate([
            'trainer' => 'required|integer',
        ]);

        // Update trainer saja
        $produk->trainer   = $request->trainer;
        $produk->update_at = now();
        $produk->save();

        // Optional: load relasi untuk response
        $produk->load(['kategori_rel:id,nama', 'user_rel:id,nama', 'trainer_rel:id,nama']);

        return response()->json([
            'success' => true,
            'message' => 'Trainer produk berhasil diperbarui',
            'data'    => $produk,
        ]);
    }
}