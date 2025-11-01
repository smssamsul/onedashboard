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
        $this->middleware('auth:api');
    }
  
    public function index()
    {
        $produk = Produk::all();

        return response()->json([
            'success' => true,
            'data' => $produk
        ]);
    }

  
    public function store(Request $request)
    {
        $request->validate([
            'kategori' => 'required|integer',
            'nama' => 'required|string|max:255',
            'header' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.file' => 'nullable|image|mimes:jpg,jpeg,png|max:2048',
            'gambar.*.caption' => 'nullable|string'
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
            'status' => '1'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dibuat',
            'data' => $produk
        ]);
    }

    public function show($id)
    {
        $produk = Produk::find($id);

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

        // Update header jika ada
        if ($request->hasFile('header')) {
            if ($produk->header && Storage::disk('public')->exists($produk->header)) {
                Storage::disk('public')->delete($produk->header);
            }
            $produk->header = $request->file('header')->store('produk/header', 'public');
        }

        // Update gambar tambahan
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

        $produk->update([
            'kategori' => $request->kategori ?? $produk->kategori,
            'nama' => $request->nama ?? $produk->nama,
            'url' => $request->url ?? $produk->url,
            'harga_coret' => $request->harga_coret ?? $produk->harga_coret,
            'harga_asli' => $request->harga_asli ?? $produk->harga_asli,
            'deskripsi' => $request->deskripsi ?? $produk->deskripsi,
            'tanggal_event' => $request->tanggal_event ?? $produk->tanggal_event,
            'lainnya' => $request->lainnya ?? $produk->lainnya,
            'landingpage' => $request->landingpage ?? $produk->landingpage,
            'update_at' => now(),
            'status' => $request->status ?? $produk->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui',
            'data' => $produk
        ]);
    }

    // ✅ Hapus produk
    public function destroy($id)
    {
        $produk = Produk::find($id);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan'
            ], 404);
        }

        // Hapus header
        if ($produk->header && Storage::disk('public')->exists($produk->header)) {
            Storage::disk('public')->delete($produk->header);
        }

        // Hapus semua gambar
        $gambarArray = json_decode($produk->gambar ?? '[]', true);
        foreach ($gambarArray as $g) {
            if (isset($g['path']) && Storage::disk('public')->exists($g['path'])) {
                Storage::disk('public')->delete($g['path']);
            }
        }

        $produk->delete();

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

        // Hapus file fisik
        Storage::disk('public')->delete($gambarData[$index]['path']);

        // Hapus dari array
        array_splice($gambarData, $index, 1);
        $produk->gambar = json_encode($gambarData);
        $produk->save();

        return response()->json(['message' => 'Gambar berhasil dihapus', 'data' => $produk]);
    }
}