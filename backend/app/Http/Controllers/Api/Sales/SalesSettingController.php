<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\SalesSetting;
use Illuminate\Http\Request;

class SalesSettingController extends Controller
{
    /**
     * Get the current sales settings.
     */
    public function show()
    {
        $setting = SalesSetting::first();
        
        // If not exists, return an empty structure
        if (!$setting) {
            $setting = new SalesSetting();
            $setting->token_google = null;
            $setting->woowa_utama = null;
            $setting->wa_engine = 'woowa';
        }

        return response()->json([
            'success' => true,
            'data' => $setting
        ]);
    }

    /**
     * Update the sales settings.
     */
    public function update(Request $request)
    {
        $request->validate([
            'woowa_utama' => 'nullable|string|max:255',
            'wa_engine'   => 'nullable|string|in:woowa,baileys',
        ]);

        $setting = SalesSetting::first() ?? new SalesSetting();

        if ($request->has('woowa_utama')) {
            $setting->woowa_utama = $request->woowa_utama;
        }

        if ($request->has('wa_engine')) {
            $setting->wa_engine = $request->wa_engine;
        }

        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Setting berhasil diperbarui',
            'data'    => $setting
        ]);
    }
}
