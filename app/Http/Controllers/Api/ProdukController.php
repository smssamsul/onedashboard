<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produk;
use Illuminate\Support\Facades\Storage;

class ProdukController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api')->except(['showByKode']);;
    }
  
    public function index()
    {

        // $tanggal = $request->query('tanggal');

        $query = Produk::with([
            'kategori_rel:id,nama',
            'user_rel:id,nama'
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
            'header' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.caption' => 'nullable|string',

               // Validasi tambahan
            'assign' => 'nullable|array',
            // 'assign.*' => 'integer|exists:users,id',

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
            // 'fb_pixel.*' => 'integer|exists:fb_pixel,id',

            'event_fb_pixel' => 'nullable|array',

            'gtm' => 'nullable|array',
            // 'gtm.*' => 'integer|exists:gtm,id',

            'video' => 'nullable|array',
            'video.*' => 'nullable|string'
        ]);

        // Simpan header utama
        $headerPath = $request->file('header')->store('produk/header', 'public');

        // Simpan gambar tambahan (multiple)
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

        // Simpan testimoni (upload gambar jika ada)
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

        $produk = Produk::create([
            'kategori' => $request->kategori,
            'user_input' => auth()->user()->id,
            'nama' => $request->nama,
            'url' => $request->url,
            'header' => $headerPath,
            'harga_coret' => $request->harga_coret,
            'harga_asli' => $request->harga_asli,
            'deskripsi' => $request->deskripsi,
            'tanggal_event' => $request->tanggal_event,
            'gambar' => json_encode($gambarArray),
            'lainnya' => $request->lainnya,
            'landingpage' => $request->landingpage,
            'create_at' => now(),
            'status' => $request->status ?? 1,

            // Field tambahan (disimpan sebagai JSON)
            'assign' => json_encode($request->assign ?? []),
            'custom_field' => json_encode($request->custom_field ?? []),
            'list_point' => json_encode($request->list_point ?? []),
            'testimoni' => json_encode($testimoniArray),
            'fb_pixel' => json_encode($request->fb_pixel ?? []),
            'event_fb_pixel' => json_encode($request->event_fb_pixel ?? []),
            'gtm' => json_encode($request->gtm ?? []),
            'video' => json_encode($request->video ?? []),
            ]);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dibuat',
            'data' => $produk
        ]);
    }

    public function show($id)
    {
        $produk = Produk::where('id', $id)
                ->where('status', '!=', 'N')
                ->first();
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

        // Update semua kolom
        $produk->update([
            'kategori' => $request->kategori ?? $produk->kategori,
            'nama' => $request->nama ?? $produk->nama,
            'url' => $request->url ?? $produk->url,
            'harga_coret' => $request->harga_coret ?? $produk->harga_coret,
            'harga_asli' => $request->harga_asli ?? $produk->harga_asli,
            'deskripsi' => $request->deskripsi ?? $produk->deskripsi,
            'tanggal_event' => $request->tanggal_event ?? $produk->tanggal_event,
            'landingpage' => $request->landingpage ?? $produk->landingpage,
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
}