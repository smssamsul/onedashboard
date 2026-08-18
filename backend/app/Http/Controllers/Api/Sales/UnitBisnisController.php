<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\UnitBisnis;
use Illuminate\Support\Str;

class UnitBisnisController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Pastikan slug unik - kalau "ternak-properti" sudah dipakai, coba
     * "ternak-properti-2", dst. $ignoreId dipakai saat update supaya baris
     * itu sendiri tidak dianggap bentrok.
     */
    private function uniqueSlug(string $nama, ?int $ignoreId = null): string
    {
        $base = Str::slug($nama);
        $slug = $base;
        $i = 2;

        while (
            UnitBisnis::where('slug', $slug)
                ->when($ignoreId, fn($q) => $q->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    public function index()
    {
        $data = UnitBisnis::withCount(['produk' => function ($query) {
                $query->where('status', '!=', 'N');
            }])
            ->where('status', '!=', 'N')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255'
        ]);

        $unitBisnis = UnitBisnis::create([
            'nama' => $request->nama,
            'slug' => $this->uniqueSlug($request->nama),
            'create_at' => now(),
            'status' => '1'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit bisnis berhasil ditambahkan',
            'data' => $unitBisnis
        ]);
    }

    public function show($id)
    {
        $unitBisnis = UnitBisnis::where('id', $id)
            ->where('status', '!=', 'N')
            ->first();

        if (!$unitBisnis) {
            return response()->json([
                'success' => false,
                'message' => 'Unit bisnis tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $unitBisnis
        ]);
    }

    public function update(Request $request, $id)
    {
        $unitBisnis = UnitBisnis::find($id);

        if (!$unitBisnis) {
            return response()->json([
                'success' => false,
                'message' => 'Unit bisnis tidak ditemukan'
            ], 404);
        }

        $namaBaru = $request->nama ?? $unitBisnis->nama;

        $unitBisnis->update([
            'nama' => $namaBaru,
            'slug' => $request->nama ? $this->uniqueSlug($namaBaru, $unitBisnis->id) : $unitBisnis->slug,
            'update_at' => now(),
            'status' => $request->status ?? $unitBisnis->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit bisnis berhasil diperbarui',
            'data' => $unitBisnis
        ]);
    }

    public function destroy($id)
    {
        $unitBisnis = UnitBisnis::find($id);

        if (!$unitBisnis) {
            return response()->json([
                'success' => false,
                'message' => 'Unit bisnis tidak ditemukan'
            ], 404);
        }

        $unitBisnis->update([
            'status' => 'N'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Unit bisnis berhasil dihapus'
        ]);
    }
}
