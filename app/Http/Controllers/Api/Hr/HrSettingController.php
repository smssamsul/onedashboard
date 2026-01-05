<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrSetting;
use Illuminate\Support\Facades\Validator;

class HrSettingController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $setting = HrSetting::first();

        if (!$setting) {
            return response()->json([
                'success' => true,
                'data' => null,
                'message' => 'Setting belum dikonfigurasi'
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $setting
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:50',
            'lat_absen' => 'required|string|max:100',
            'long_long' => 'required|string|max:100',
            'radius' => 'required|numeric|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cek apakah sudah ada setting
        $setting = HrSetting::first();

        if ($setting) {
            $setting->nama = $request->nama;
            $setting->lat_absen = $request->lat_absen;
            $setting->long_long = $request->long_long;
            $setting->radius = $request->radius;
            $setting->update_at = now()->format('Y-m-d H:i:s');
            $setting->save();
        } else {
            $setting = HrSetting::create([
                'nama' => $request->nama,
                'lat_absen' => $request->lat_absen,
                'long_long' => $request->long_long,
                'radius' => $request->radius,
                'create_at' => now()->format('Y-m-d H:i:s'),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Setting lokasi absensi berhasil disimpan',
            'data' => $setting
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $setting = HrSetting::find($id);

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:50',
            'lat_absen' => 'required|string|max:100',
            'long_long' => 'required|string|max:100',
            'radius' => 'required|numeric|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $setting->nama = $request->nama;
        $setting->lat_absen = $request->lat_absen;
        $setting->long_long = $request->long_long;
        $setting->radius = $request->radius;
        $setting->update_at = now()->format('Y-m-d H:i:s');
        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Setting lokasi absensi berhasil diupdate',
            'data' => $setting
        ]);
    }
}

