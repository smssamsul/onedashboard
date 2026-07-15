<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produk;
use App\Models\ZoomRecord;

class ZoomRecordController extends Controller
{
    /**
     * List record link by produk (1 to many)
     */
    public function index($produkId)
    {
        $produk = Produk::find($produkId);

        if (!$produk) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak ditemukan',
            ], 404);
        }

        $records = ZoomRecord::where('id_produk', $produkId)
            ->orderBy('create_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data record zoom berhasil diambil',
            'produk' => [
                'id' => $produk->id,
                'nama' => $produk->nama,
                'kode' => $produk->kode,
            ],
            'total' => $records->count(),
            'data' => $records,
        ]);
    }

    /**
     * Create record link
     */
    public function store(Request $request)
    {
        $request->validate([
            'id_produk' => 'required|exists:produk,id',
            'link' => 'required|string',
        ]);

        $link = trim((string) $request->link);

        if (!filter_var($link, FILTER_VALIDATE_URL)) {
            return response()->json([
                'success' => false,
                'message' => 'Format link tidak valid',
            ], 422);
        }

        $record = ZoomRecord::create([
            'id_produk' => (int) $request->id_produk,
            'link' => $link,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Link record zoom berhasil ditambahkan',
            'data' => $record,
        ]);
    }

    /**
     * Delete a record link
     */
    public function destroy($id)
    {
        $record = ZoomRecord::find($id);

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Data record zoom tidak ditemukan',
            ], 404);
        }

        $record->delete();

        return response()->json([
            'success' => true,
            'message' => 'Link record zoom berhasil dihapus',
        ]);
    }
}

