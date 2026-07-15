<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AiSetting;
use Illuminate\Support\Facades\Validator;

class AiSettingController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $setting = AiSetting::first();

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
            'prompt' => 'nullable|string',
            'prompt_cold' => 'nullable|string',
            'prompt_warm' => 'nullable|string',
            'woowa_key' => 'nullable|string',
            'is_on' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $setting = AiSetting::first();

        if ($setting) {
            if ($request->has('prompt')) {
                $setting->prompt = $request->prompt;
            }
            if ($request->has('prompt_cold')) {
                $setting->prompt_cold = $request->prompt_cold;
            }
            if ($request->has('prompt_warm')) {
                $setting->prompt_warm = $request->prompt_warm;
            }
            if ($request->has('woowa_key')) {
                $setting->woowa_key = $request->woowa_key;
            }
            if ($request->has('is_on')) {
                $setting->is_on = $request->is_on;
            }
            $setting->save();
        } else {
            $setting = AiSetting::create([
                'prompt' => $request->prompt ?? null,
                'prompt_cold' => $request->prompt_cold ?? null,
                'prompt_warm' => $request->prompt_warm ?? null,
                'woowa_key' => $request->woowa_key ?? null,
                'is_on' => $request->is_on ?? true,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'AI prompt berhasil disimpan',
            'data' => $setting
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $setting = AiSetting::find($id);

        if (!$setting) {
            return response()->json([
                'success' => false,
                'message' => 'Setting tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'prompt' => 'nullable|string',
            'prompt_cold' => 'nullable|string',
            'prompt_warm' => 'nullable|string',
            'woowa_key' => 'nullable|string',
            'is_on' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        if ($request->has('prompt')) {
            $setting->prompt = $request->prompt;
        }
        if ($request->has('prompt_cold')) {
            $setting->prompt_cold = $request->prompt_cold;
        }
        if ($request->has('prompt_warm')) {
            $setting->prompt_warm = $request->prompt_warm;
        }
        if ($request->has('woowa_key')) {
            $setting->woowa_key = $request->woowa_key;
        }
        if ($request->has('is_on')) {
            $setting->is_on = $request->is_on;
        }
        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'AI prompt berhasil diupdate',
            'data' => $setting
        ]);
    }
}
