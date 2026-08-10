<?php

namespace App\Http\Controllers;

use App\Models\EcourseBab;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EcourseBabController extends Controller
{
    /**
     * Daftar bab + lesson di dalamnya untuk satu produk kursus, dipakai
     * halaman editor kurikulum admin. video_url di-generate sekalian
     * (temporary, sama seperti EcourseController::index) supaya admin bisa
     * preview tanpa request tambahan.
     */
    public function index(Request $request)
    {
        $request->validate([
            'produk_id' => 'required|integer|exists:produk,id',
        ]);

        $babs = EcourseBab::where('produk_id', $request->produk_id)
            ->orderBy('urutan')
            ->with('ecourses')
            ->get();

        $babs->each(function ($bab) {
            $bab->ecourses->each(function ($ecourse) {
                if ($ecourse->video_path) {
                    try {
                        $ecourse->video_url = Storage::disk('s3')->temporaryUrl(
                            $ecourse->video_path,
                            now()->addMinutes(30)
                        );
                    } catch (\Exception $e) {
                        $ecourse->video_url = null;
                    }
                }
            });
        });

        return response()->json([
            'status' => 'success',
            'data' => $babs,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'produk_id' => 'required|integer|exists:produk,id',
            'judul' => 'required|string|max:255',
            'overview' => 'nullable|string',
        ]);

        $urutanBerikutnya = 1 + (int) EcourseBab::where('produk_id', $request->produk_id)->max('urutan');

        $bab = EcourseBab::create([
            'produk_id' => $request->produk_id,
            'judul' => $request->judul,
            'overview' => $request->overview,
            'urutan' => $urutanBerikutnya,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $bab,
        ]);
    }

    public function update(Request $request, $id)
    {
        $bab = EcourseBab::findOrFail($id);

        $request->validate([
            'judul' => 'required|string|max:255',
            'overview' => 'nullable|string',
        ]);

        $bab->update([
            'judul' => $request->judul,
            'overview' => $request->overview,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $bab,
        ]);
    }

    /**
     * Urutan bab dikirim lengkap sebagai [{id, urutan}, ...] dari drag/tombol
     * naik-turun di frontend, ditulis ulang sekaligus.
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'urutan' => 'required|array',
            'urutan.*.id' => 'required|integer|exists:ecourse_bab,id',
            'urutan.*.urutan' => 'required|integer',
        ]);

        foreach ($request->urutan as $item) {
            EcourseBab::where('id', $item['id'])->update(['urutan' => $item['urutan']]);
        }

        return response()->json(['status' => 'success']);
    }

    public function destroy($id)
    {
        $bab = EcourseBab::with('ecourses')->findOrFail($id);

        foreach ($bab->ecourses as $ecourse) {
            if ($ecourse->video_path) {
                Storage::disk('s3')->delete($ecourse->video_path);
            }
        }

        // Lesson di dalamnya ikut terhapus lewat FK cascade.
        $bab->delete();

        return response()->json(['status' => 'success']);
    }
}
