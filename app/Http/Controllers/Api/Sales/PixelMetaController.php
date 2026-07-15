<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PixelMeta;
use Illuminate\Support\Facades\Validator;

class PixelMetaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $pixels = PixelMeta::all();

        return response()->json([
            'success' => true,
            'data' => $pixels
        ]);
    }

    public function show($id)
    {
        $pixel = PixelMeta::find($id);

        if (!$pixel) {
            return response()->json([
                'success' => false,
                'message' => 'Pixel tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $pixel
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string',
            'pixel' => 'required|string',
            'conversion_api_token' => 'nullable|string',
            'kode_testing' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $pixel = PixelMeta::create([
            'nama' => $request->nama,
            'pixel' => $request->pixel,
            'conversion_api_token' => $request->conversion_api_token,
            'kode_testing' => $request->kode_testing,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pixel berhasil dibuat',
            'data' => $pixel
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $pixel = PixelMeta::find($id);

        if (!$pixel) {
            return response()->json([
                'success' => false,
                'message' => 'Pixel tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string',
            'pixel' => 'required|string',
            'conversion_api_token' => 'nullable|string',
            'kode_testing' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $pixel->nama = $request->nama;
        $pixel->pixel = $request->pixel;
        $pixel->conversion_api_token = $request->conversion_api_token;
        $pixel->kode_testing = $request->kode_testing;
        $pixel->save();

        return response()->json([
            'success' => true,
            'message' => 'Pixel berhasil diupdate',
            'data' => $pixel
        ]);
    }

    public function destroy($id)
    {
        $pixel = PixelMeta::find($id);

        if (!$pixel) {
            return response()->json([
                'success' => false,
                'message' => 'Pixel tidak ditemukan'
            ], 404);
        }

        $pixel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Pixel berhasil dihapus'
        ]);
    }

    // Public endpoint untuk frontend-tp (tanpa auth)
    public function getActivePixel()
    {
        $pixel = PixelMeta::first();

        return response()->json([
            'success' => true,
            'fb_pixel_id' => $pixel ? $pixel->pixel : null,
            'data' => $pixel // Backward compatibility, but returning full data
        ]);
    }

    public function getPublicPixels(Request $request)
    {
        $ids = $request->input('ids', []);
        
        if (empty($ids)) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        $validIds = array_filter($ids, function($val) {
            return is_numeric($val) && $val <= 2147483647;
        });

        $pixels = PixelMeta::whereIn('pixel', $ids)
            ->when(!empty($validIds), function ($query) use ($validIds) {
                return $query->orWhereIn('id', $validIds);
            })->get();

        return response()->json([
            'success' => true,
            'data' => $pixels
        ]);
    }
}
