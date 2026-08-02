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

        // Kolom delay boleh NULL (= ikut .env). Frontend butuh nilai yang
        // benar-benar dipakai cron supaya form tidak menampilkan kolom kosong
        // padahal jeda sebenarnya tetap berjalan.
        [$delayMin, $delayMax] = SalesSetting::getFollowupDelayRange();

        return response()->json([
            'success' => true,
            'data' => array_merge($setting->toArray(), [
                'followup_delay_min' => $delayMin,
                'followup_delay_max' => $delayMax,
            ]),
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
            // Batas atas 3600 detik: lebih dari sejam per pesan berarti antrean
            // satu run cron bisa tumpang tindih dengan run berikutnya.
            'followup_delay_min' => 'nullable|integer|min:0|max:3600',
            'followup_delay_max' => 'nullable|integer|min:0|max:3600|gte:followup_delay_min',
        ], [
            'followup_delay_max.gte' => 'Jeda maksimum tidak boleh lebih kecil dari jeda minimum.',
        ]);

        $setting = SalesSetting::first() ?? new SalesSetting();

        if ($request->has('woowa_utama')) {
            $setting->woowa_utama = $request->woowa_utama;
        }

        if ($request->has('wa_engine')) {
            $setting->wa_engine = $request->wa_engine;
        }

        if ($request->has('followup_delay_min')) {
            $setting->followup_delay_min = $request->followup_delay_min;
        }

        if ($request->has('followup_delay_max')) {
            $setting->followup_delay_max = $request->followup_delay_max;
        }

        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Setting berhasil diperbarui',
            'data'    => $setting
        ]);
    }
}
