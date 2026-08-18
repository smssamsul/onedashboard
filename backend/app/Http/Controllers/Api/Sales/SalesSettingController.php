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

        // Kolom delay/kuota boleh NULL (= ikut default kode). Frontend butuh
        // nilai yang benar-benar dipakai supaya form tidak menampilkan kolom
        // kosong padahal defaultnya tetap berjalan.
        [$delayMin, $delayMax] = SalesSetting::getFollowupDelayRange();
        [$quotaMax, $quotaWindow] = SalesSetting::getBaileysQuota();

        return response()->json([
            'success' => true,
            'data' => array_merge($setting->toArray(), [
                'followup_delay_min' => $delayMin,
                'followup_delay_max' => $delayMax,
                'baileys_quota_max_messages' => $quotaMax,
                'baileys_quota_window_minutes' => $quotaWindow,
                'auto_followup_enabled' => SalesSetting::getAutoFollowupEnabled(),
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
            'baileys_quota_max_messages' => 'nullable|integer|min:1|max:1000',
            'baileys_quota_window_minutes' => 'nullable|integer|min:1|max:1440',
            'auto_followup_enabled' => 'nullable|boolean',
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

        if ($request->has('baileys_quota_max_messages')) {
            $setting->baileys_quota_max_messages = $request->baileys_quota_max_messages;
        }

        if ($request->has('baileys_quota_window_minutes')) {
            $setting->baileys_quota_window_minutes = $request->baileys_quota_window_minutes;
        }

        if ($request->has('auto_followup_enabled')) {
            $setting->auto_followup_enabled = $request->boolean('auto_followup_enabled');
        }

        $setting->save();

        return response()->json([
            'success' => true,
            'message' => 'Setting berhasil diperbarui',
            'data'    => $setting
        ]);
    }
}
