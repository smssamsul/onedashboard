<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Backfill status=1 untuk template_follup tipe instant-send (Welcome=5, Processing=6, Complete=7, Redirect=9).
 *
 * Sebelum ini, checkbox "Enable Auto Send" untuk keempat tipe di atas tersimpan sebagai status=1/2
 * tapi TIDAK pernah benar-benar dicek sebelum kirim WA (lihat OrderCustomerController, DokuController,
 * OrderValidationController) -- pesan selalu terkirim terlepas dari nilai status. Migration ini
 * menyamakan status jadi 1 untuk semua baris yang saat ini bukan 'N' (arsip), supaya begitu kode
 * fix-nya jalan (yang benar-benar mengecek status), tidak ada produk yang tiba-tiba berhenti kirim
 * WA hanya karena checkbox-nya kebetulan tidak tercentang sebelumnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('template_follup')
            ->whereIn('type', ['5', '6', '7', '9'])
            ->where(function ($query) {
                $query->whereNull('status')
                      ->orWhereNotIn('status', ['1', 'N']);
            })
            ->update(['status' => '1']);
    }

    public function down(): void
    {
        // Tidak ada nilai lama yang tersimpan untuk di-rollback secara akurat;
        // down() sengaja dibiarkan no-op.
    }
};
