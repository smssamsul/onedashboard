<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produk;
use App\Models\Webinar;
use App\Models\ProdukBundling;
use App\Models\ProdukJadwal;
use App\Models\Post;
use App\Services\ZoomService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class ProdukController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api')->except(['showByKode', 'publicSeminarSchedules']);
    }

    /**
     * Convert base64 image to file and save
     */
    private function saveBase64Image($base64String, $produkId, $folder = 'images')
    {
        if (empty($base64String) || !is_string($base64String)) {
            return null;
        }
        
        // Deteksi base64 image (format: data:image/png;base64,... atau data:image/webp;base64,...)
        // Support berbagai format: png, jpeg, jpg, gif, webp, bmp, svg+xml, dll
        if (preg_match('/^data:image\/(\w+)(?:\+xml)?;base64,/', $base64String, $matches)) {
            $imageType = strtolower($matches[1]); // png, jpeg, jpg, gif, webp, etc
            
            // Normalize image type (jpeg -> jpg)
            if ($imageType === 'jpeg') {
                $imageType = 'jpg';
            }
            
            // Extract base64 data (setelah koma)
            $base64Data = substr($base64String, strpos($base64String, ',') + 1);
            $imageData = base64_decode($base64Data, true); // strict mode
            
            if ($imageData === false) {
                Log::warning('Failed to decode base64 image', [
                    'produk_id' => $produkId,
                    'folder' => $folder,
                    'image_type' => $imageType
                ]);
                return null; // Gagal decode
            }
            
            // Generate unique filename
            $filename = uniqid() . '_' . time() . '.' . $imageType;
            $path = "produk/landingpage/{$produkId}/{$folder}/{$filename}";
            
            // Simpan file
            try {
                Storage::disk('public')->put($path, $imageData);
                return $path;
            } catch (\Exception $e) {
                Log::error('Failed to save base64 image', [
                    'produk_id' => $produkId,
                    'folder' => $folder,
                    'path' => $path,
                    'error' => $e->getMessage()
                ]);
                return null;
            }
        }
        
        return null;
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
                $oldSrc = $component['content']['src'] ?? null;
                
                // Cek apakah src adalah base64 image
                if (isset($component['content']['src']) && 
                    is_string($component['content']['src']) &&
                    strpos($component['content']['src'], 'data:image/') === 0) {
                    // Hapus file lama jika ada (untuk update)
                    if ($oldSrc && 
                        strpos($oldSrc, 'data:image/') !== 0 &&
                        strpos($oldSrc, 'produk/landingpage/') === 0 &&
                        Storage::disk('public')->exists($oldSrc)) {
                        Storage::disk('public')->delete($oldSrc);
                    }
                    
                    // Convert base64 ke file
                    $savedPath = $this->saveBase64Image($component['content']['src'], $produkId, 'images');
                    if ($savedPath) {
                        $component['content']['src'] = $savedPath;
                    }

                    Log::info("Image uploaded: " . $savedPath);
                }
                // Cek apakah ada file upload untuk image ini
                elseif (isset($component['content']['src']) && 
                    (strpos($component['content']['src'], 'http') === 0 || 
                     strpos($component['content']['src'], '/storage/') === 0 ||
                     strpos($component['content']['src'], 'produk/landingpage/') === 0)) {

                        Log::info("Image already uploaded: " . $component['content']['src']);
                    // Sudah URL/path yang valid, skip
                    continue;
                }
                else {

                    Log::info("Image not uploaded: " . $component['content']['src']);
                    // Cek file upload via form
                    $fileKey = $componentId ? "landingpage_image_{$componentId}" : null;
                    if ($fileKey && $request->hasFile($fileKey)) {
                        // Hapus file lama jika ada (untuk update)
                        if ($oldSrc && 
                            strpos($oldSrc, 'produk/landingpage/') === 0 &&
                            Storage::disk('public')->exists($oldSrc)) {
                            Storage::disk('public')->delete($oldSrc);
                        }
                        
                        $file = $request->file($fileKey);
                        if ($file && $file->isValid()) {
                            $path = $file->store("produk/landingpage/{$produkId}/images", 'public');
                            $component['content']['src'] = $path;
                        }
                    }
                }
            }

            // Process image-slider component
            if ($type === 'image-slider' && isset($component['content']['images']) && is_array($component['content']['images'])) {
                foreach ($component['content']['images'] as $idx => &$image) {
                    $oldSrc = $image['src'] ?? null;
                    
                    // Cek apakah src adalah base64 image
                    if (isset($image['src']) && 
                        is_string($image['src']) &&
                        strpos($image['src'], 'data:image/') === 0) {
                        // Hapus file lama jika ada (untuk update)
                        if ($oldSrc && 
                            strpos($oldSrc, 'data:image/') !== 0 &&
                            strpos($oldSrc, 'produk/landingpage/') === 0 &&
                            Storage::disk('public')->exists($oldSrc)) {
                            Storage::disk('public')->delete($oldSrc);
                        }
                        
                        // Convert base64 ke file
                        $savedPath = $this->saveBase64Image($image['src'], $produkId, 'slider');
                        if ($savedPath) {
                            $image['src'] = $savedPath;
                        }
                    }
                    // Jika src adalah URL atau path yang sudah ada, skip
                    elseif (isset($image['src']) && 
                        (strpos($image['src'], 'http') === 0 || 
                         strpos($image['src'], '/storage/') === 0 ||
                         strpos($image['src'], 'produk/landingpage/') === 0)) {
                        continue;
                    }
                    else {
                        // Cek file upload via form
                        $fileKey = $componentId ? "landingpage_slider_{$componentId}_{$idx}" : null;
                        if ($fileKey && $request->hasFile($fileKey)) {
                            // Hapus file lama jika ada (untuk update)
                            if ($oldSrc && 
                                strpos($oldSrc, 'produk/landingpage/') === 0 &&
                                Storage::disk('public')->exists($oldSrc)) {
                                Storage::disk('public')->delete($oldSrc);
                            }
                            
                            $file = $request->file($fileKey);
                            if ($file && $file->isValid()) {
                                $path = $file->store("produk/landingpage/{$produkId}/slider", 'public');
                                $image['src'] = $path;
                            }
                        }
                    }
                }
            }

            // Process testimoni component
            if ($type === 'testimoni' && isset($component['content']['items']) && is_array($component['content']['items'])) {
                foreach ($component['content']['items'] as $idx => &$testi) {
                    $oldGambar = $testi['gambar'] ?? null;
                    
                    // Cek apakah gambar adalah base64 image
                    if (isset($testi['gambar']) && 
                        is_string($testi['gambar']) &&
                        strpos($testi['gambar'], 'data:image/') === 0) {
                        // Hapus file lama jika ada (untuk update)
                        if ($oldGambar && 
                            strpos($oldGambar, 'data:image/') !== 0 &&
                            strpos($oldGambar, 'produk/landingpage/') === 0 &&
                            Storage::disk('public')->exists($oldGambar)) {
                            Storage::disk('public')->delete($oldGambar);
                        }
                        
                        // Convert base64 ke file
                        $savedPath = $this->saveBase64Image($testi['gambar'], $produkId, 'testimoni');
                        if ($savedPath) {
                            $testi['gambar'] = $savedPath;
                        }
                    }
                    // Jika gambar adalah URL atau path yang sudah ada, skip
                    elseif (isset($testi['gambar']) && 
                        (strpos($testi['gambar'], 'http') === 0 || 
                         strpos($testi['gambar'], '/storage/') === 0 ||
                         strpos($testi['gambar'], 'produk/landingpage/') === 0)) {
                        continue;
                    }
                    else {
                        // Cek file upload via form
                        $fileKey = $componentId ? "landingpage_testimoni_{$componentId}_{$idx}" : null;
                        if ($fileKey && $request->hasFile($fileKey)) {
                            // Hapus file lama jika ada (untuk update)
                            if ($oldGambar && 
                                strpos($oldGambar, 'produk/landingpage/') === 0 &&
                                Storage::disk('public')->exists($oldGambar)) {
                                Storage::disk('public')->delete($oldGambar);
                            }
                            
                            $file = $request->file($fileKey);
                            if ($file && $file->isValid()) {
                                $path = $file->store("produk/landingpage/{$produkId}/testimoni", 'public');
                                $testi['gambar'] = $path;
                            }
                        }
                    }
                }
            }
        }

        return json_encode($landingpage);
    }
  
    public function index(Request $request)
    {
        $columns = Schema::getColumnListing('produk');

        // buang kolom landingpage
        $columns = array_diff($columns, ['landingpage']);
        
        $driver = Schema::getConnection()->getDriverName();
        $sumExpr = $driver === 'pgsql'
            ? 'COALESCE(SUM(CAST(NULLIF(TRIM(total_harga::text), \'\') AS DECIMAL(15,2))), 0)'
            : 'COALESCE(SUM(CAST(NULLIF(TRIM(total_harga), \'\') AS DECIMAL(15,2))), 0)';

        $query = Produk::select($columns)
            ->selectSub(function ($query) use ($sumExpr) {
                $query->from('order_customer')
                    ->selectRaw($sumExpr)
                    ->whereColumn('order_customer.produk', 'produk.id')
                    ->where('order_customer.status', '!=', 'N')
                    ->where(function ($q) {
                        $q->whereIn('order_customer.status_pembayaran', ['2', 2])
                            ->orWhereIn('order_customer.status_order', ['2', 2]);
                    });
            }, 'total_revenue')
            ->with([
                'kategori_rel:id,nama',
                'user_rel:id,nama',
                'trainer_rel:id,nama',
                'bundling_rel:id,produk,nama,harga,status',
                'jadwal_rel:id,produk_id,nama_jadwal,waktu_mulai,waktu_selesai,kuota,status',
            ])
            ->when(!$request->boolean('quick_order'), function ($q) {
                $q->whereNotNull('landingpage');
            })
            ->where('status', '!=', 'N')
            ->orderBy('create_at', 'desc');

        // Jika parameter all=true, return semua data tanpa pagination
        // if ($request->has('all') && $request->all == 'true') {
            $produk = $query->get();
            
            return response()->json([
                'success' => true,
                'data' => $produk,
                'total' => $produk->count()
            ]);
        // }

        // Pagination
        // $perPage = $request->get('per_page', 15);
        // $produk = $query->paginate($perPage);

        // return response()->json([
        //     'success' => true,
        //     'data' => $produk->items(),
        //     'pagination' => [
        //         'current_page' => $produk->currentPage(),
        //         'last_page' => $produk->lastPage(),
        //         'per_page' => $produk->perPage(),
        //         'total' => $produk->total(),
        //     ]
        // ]);
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
            'kota' => 'nullable|string',
            'tempat' => 'nullable|string',
            'alamat' => 'nullable|string',
            'header' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'gambar.*.caption' => 'nullable|string',
            'custom_field' => 'nullable|array',
            'custom_field.*.nama_field' => 'required_with:custom_field|string',
            'custom_field.*.urutan' => 'nullable|integer',
            'list_point' => 'nullable|array',
            'list_point.*.nama' => 'required_with:list_point|string',
            'list_point.*.urutan' => 'nullable|integer',
            'testimoni' => 'nullable|array',
            'testimoni.*.gambar' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'testimoni.*.nama' => 'nullable|string',
            'testimoni.*.deskripsi' => 'nullable|string',
            'fb_pixel' => 'nullable|array',
            'event_fb_pixel' => 'nullable|array',
            'gtm' => 'nullable|array',
            'video' => 'nullable|array',
            'video.*' => 'nullable|string',
            'post' => 'nullable|array',
            'post.*' => 'nullable|integer|exists:post,id',
            'jadwal' => 'nullable|array',
            'jadwal.*.nama_jadwal' => 'required_with:jadwal|string',
            'jadwal.*.waktu_mulai' => 'required_with:jadwal',
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
            'tampil_jadwal' => $request->has('tampil_jadwal') ? filter_var($request->tampil_jadwal, FILTER_VALIDATE_BOOLEAN) : true,
            'trainer' => $request->trainer,
            'post' => json_encode($request->post ?? []),
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
        
        // Process jadwal - simpan ke table produk_jadwal
        if ($request->has('jadwal') && is_array($request->jadwal)) {
            foreach ($request->jadwal as $jadwalItem) {
                if (isset($jadwalItem['nama_jadwal']) && isset($jadwalItem['waktu_mulai'])) {
                    ProdukJadwal::create([
                        'produk_id' => $produk->id,
                        'nama_jadwal' => $jadwalItem['nama_jadwal'],
                        'waktu_mulai' => $jadwalItem['waktu_mulai'],
                        'waktu_selesai' => $jadwalItem['waktu_selesai'] ?? null,
                        'kuota' => $jadwalItem['kuota'] ?? null,
                        'status' => $jadwalItem['status'] ?? 'A',
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
            'trainer_rel:id,nama',
            'bundling_rel:id,produk,nama,harga,status',
            'jadwal_rel:id,produk_id,nama_jadwal,waktu_mulai,waktu_selesai,kuota,status'
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
            'post',
            'jadwal',
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
            'kota' => 'nullable|string',
            'tempat' => 'nullable|string',
            'alamat' => 'nullable|string',
            'header' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'gambar.*.caption' => 'nullable|string',
            'assign' => 'nullable|array',
            'custom_field' => 'nullable|array',
            'custom_field.*.nama_field' => 'required_with:custom_field|string',
            'custom_field.*.urutan' => 'nullable|integer',
            'list_point' => 'nullable|array',
            'list_point.*.nama' => 'required_with:list_point|string',
            'list_point.*.urutan' => 'nullable|integer',
            'testimoni' => 'nullable|array',
            'testimoni.*.gambar' => 'nullable|image|mimes:jpg,jpeg,png,webp,heic|max:2048',
            'testimoni.*.nama' => 'nullable|string',
            'testimoni.*.deskripsi' => 'nullable|string',
            'fb_pixel' => 'nullable|array',
            'event_fb_pixel' => 'nullable|array',
            'gtm' => 'nullable|array',
            'video' => 'nullable|array',
            'video.*' => 'nullable|string',
            'post' => 'nullable|array',
            'post.*' => 'nullable|integer|exists:post,id',
            'jadwal' => 'nullable|array',
            'jadwal.*.nama_jadwal' => 'required_with:jadwal|string',
            'jadwal.*.waktu_mulai' => 'required_with:jadwal',
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

        // Hapus jadwal lama jika ada jadwal baru
        if ($request->has('jadwal')) {
            ProdukJadwal::where('produk_id', $id)->delete();
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
            'tampil_jadwal' => $request->has('tampil_jadwal') ? filter_var($request->tampil_jadwal, FILTER_VALIDATE_BOOLEAN) : $produk->tampil_jadwal,
            'landingpage' => $landingpageData,
            'post' => json_encode($request->post ?? json_decode($produk->post, true) ?? []),
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

        // Process jadwal - simpan ke table produk_jadwal
        if ($request->has('jadwal') && is_array($request->jadwal)) {
            foreach ($request->jadwal as $jadwalItem) {
                if (isset($jadwalItem['nama_jadwal']) && isset($jadwalItem['waktu_mulai'])) {
                    ProdukJadwal::create([
                        'produk_id' => $produk->id,
                        'nama_jadwal' => $jadwalItem['nama_jadwal'],
                        'waktu_mulai' => $jadwalItem['waktu_mulai'],
                        'waktu_selesai' => $jadwalItem['waktu_selesai'] ?? null,
                        'kuota' => $jadwalItem['kuota'] ?? null,
                        'status' => $jadwalItem['status'] ?? 'A',
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
            ->with([
                'kategori_rel:id,nama', 
                'user_rel:id,nama',
                'bundling_rel:id,produk,nama,harga,status',
                'jadwal_rel:id,produk_id,nama_jadwal,waktu_mulai,waktu_selesai,kuota,status'
            ])
            ->first();

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        // Ambil data pixel dari tabel pixel_meta
        $fbPixelIds = is_string($produk->fb_pixel) ? json_decode($produk->fb_pixel, true) : $produk->fb_pixel;
        if (!is_array($fbPixelIds)) {
            $fbPixelIds = [];
        }
        
        $validIds = array_filter($fbPixelIds, function($val) {
            return is_numeric($val) && $val <= 2147483647;
        });

        $pixels = \App\Models\PixelMeta::whereIn('pixel', $fbPixelIds)
            ->when(!empty($validIds), function ($query) use ($validIds) {
                return $query->orWhereIn('id', $validIds);
            })->get();

        $produk->pixel_list = $pixels;

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

        $request->validate([
            'trainer' => 'nullable|integer|exists:user,id',
            'fee_trainer' => 'nullable|numeric|min:0|max:100',
        ]);

        if ($request->trainer === null || $request->trainer === '') {
            $produk->trainer = null;
            $produk->fee_trainer = null;
        } else {
            $produk->trainer = $request->trainer;
            if ($request->has('fee_trainer')) {
                $v = $request->input('fee_trainer');
                $produk->fee_trainer = $v === null || $v === '' ? null : round((float) $v, 2);
            }
        }

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

    public function updatePost(Request $request, $id)
    {
        $produk = Produk::find($id);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        // Decode JSON string jika ada
        if ($request->has('post') && is_string($request->post)) {
            $decoded = json_decode($request->post, true);
            if (json_last_error() === JSON_ERROR_NONE) {
                $request->merge(['post' => $decoded]);
            }
        }

        $request->validate([
            'post' => 'nullable|array',
            'post.*' => 'nullable|integer|exists:post,id',
        ]);

        $produk->post = json_encode($request->post ?? []);
        $produk->update_at = now();
        $produk->save();

        $produk->load(['kategori_rel:id,nama', 'user_rel:id,nama']);

        return response()->json([
            'success' => true,
            'message' => 'Post produk berhasil diperbarui',
            'data' => $produk,
        ]);
    }

    public function publicSeminarSchedules(Request $request)
    {
        // Kategori 3 = Seminar
        $produk = Produk::with(['jadwal_rel' => function ($query) {
            $query->where('waktu_mulai', '>=', now())
                  ->where('status', '!=', 'N')
                  ->orderBy('waktu_mulai', 'asc');
        }])
        ->where('kategori', 3) // Seminar
        ->where('tampil_jadwal', true)
        ->where('status', '!=', 'N') // Assuming N means inactive/deleted
        ->whereHas('jadwal_rel', function ($query) {
            $query->where('waktu_mulai', '>=', now())
                  ->where('status', '!=', 'N');
        })
        ->orderByRaw('(
            SELECT MIN(waktu_mulai)
            FROM produk_jadwal
            WHERE produk_jadwal.produk_id = produk.id
              AND produk_jadwal.waktu_mulai >= NOW()
              AND produk_jadwal.status != \'N\'
        ) ASC NULLS LAST')
        ->get();

        return response()->json([
            'success' => true,
            'data' => $produk
        ]);
    }
}