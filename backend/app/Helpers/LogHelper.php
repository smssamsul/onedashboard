<?php

use App\Models\Log;
use Illuminate\Support\Facades\Auth;

if (!function_exists('addLog')) {
    /**
     * Tambahkan log baru ke database.
     *
     * @param string $keterangan
     * @param int|null $customer
     * @param string $status
     * @return \App\Models\Log
     */
    function addLog(string $keterangan, ?int $customer = null, ?int $userId = null, string $status = 'A')
    {
        // $userId = auth()->user()->id;
        // $userId = Auth::id() ?? null;

        return Log::create([
            'user' => $userId,
            'customer' => $customer,
            'keterangan' => $keterangan,
            'create_at' => now(),
            'update_at' => now(),
            'status' => $status,
        ]);
    }
}