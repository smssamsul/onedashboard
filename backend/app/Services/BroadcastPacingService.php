<?php

namespace App\Services;

/**
 * Hitung jadwal jeda pengiriman broadcast (anti-banned): interval antar
 * pesan, istirahat tiap N pesan, dan pemecahan per sesi untuk database
 * besar. Dipakai bareng oleh BroadcastController (kirim langsung) dan
 * SendScheduledBroadcastCron (broadcast terjadwal) supaya rumusnya konsisten
 * di kedua jalur - lihat docs percakapan fitur "Pengaturan Pengiriman
 * (anti-banned)" untuk contoh perhitungannya.
 */
class BroadcastPacingService
{
    /**
     * @return int[] Daftar jeda (detik dari sekarang) untuk tiap penerima ke-0..$count-1,
     *                dipakai sebagai argumen ->delay() saat dispatch job.
     */
    public static function computeDelays(int $count, array $settings): array
    {
        $interval = max(0, (int) ($settings['interval_detik'] ?? 0));
        $jedaSetiapN = max(0, (int) ($settings['jeda_setiap_n_pesan'] ?? 0));
        $istirahat = max(0, (int) ($settings['istirahat_detik'] ?? 0));
        $maxPerSesi = max(0, (int) ($settings['max_penerima_per_sesi'] ?? 0));
        $jedaAntarSesiDetik = max(0, (int) ($settings['jeda_antar_sesi_menit'] ?? 0)) * 60;

        $delays = [];
        $elapsed = 0;
        $sentInSession = 0;
        $sentSinceIstirahat = 0;

        for ($i = 0; $i < $count; $i++) {
            if ($maxPerSesi > 0 && $sentInSession >= $maxPerSesi) {
                $elapsed += $jedaAntarSesiDetik;
                $sentInSession = 0;
                $sentSinceIstirahat = 0;
            }

            $delays[] = $elapsed;

            $sentInSession++;
            $sentSinceIstirahat++;

            // Jeda sebelum pesan berikutnya - tidak perlu ditambahkan setelah pesan terakhir,
            // tapi menyisakannya tidak masalah karena tidak ada lagi delay yang dipakai.
            $elapsed += $interval;

            if ($jedaSetiapN > 0 && $sentSinceIstirahat >= $jedaSetiapN) {
                $elapsed += $istirahat;
                $sentSinceIstirahat = 0;
            }
        }

        return $delays;
    }

    /**
     * Ambil kelima setting pacing dari record Broadcast (atau array target-like)
     * sebagai array asosiatif siap dipakai computeDelays().
     */
    public static function settingsFromBroadcast($broadcast): array
    {
        return [
            'interval_detik' => $broadcast->interval_detik ?? null,
            'jeda_setiap_n_pesan' => $broadcast->jeda_setiap_n_pesan ?? null,
            'istirahat_detik' => $broadcast->istirahat_detik ?? null,
            'max_penerima_per_sesi' => $broadcast->max_penerima_per_sesi ?? null,
            'jeda_antar_sesi_menit' => $broadcast->jeda_antar_sesi_menit ?? null,
        ];
    }
}
