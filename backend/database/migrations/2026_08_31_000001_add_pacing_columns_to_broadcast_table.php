<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Kolom pengaturan pengiriman anti-banned per broadcast: interval antar pesan,
 * jeda tiap N pesan, lama istirahat, dan pemecahan per sesi untuk database
 * besar. Semua nullable — broadcast lama tanpa nilai ini tetap terkirim
 * langsung tanpa jeda (fallback ditangani di kode pengirim).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('broadcast', function (Blueprint $table) {
            if (!Schema::hasColumn('broadcast', 'interval_detik')) {
                $table->unsignedInteger('interval_detik')->nullable()->after('target');
            }
            if (!Schema::hasColumn('broadcast', 'jeda_setiap_n_pesan')) {
                $table->unsignedInteger('jeda_setiap_n_pesan')->nullable()->after('interval_detik');
            }
            if (!Schema::hasColumn('broadcast', 'istirahat_detik')) {
                $table->unsignedInteger('istirahat_detik')->nullable()->after('jeda_setiap_n_pesan');
            }
            if (!Schema::hasColumn('broadcast', 'max_penerima_per_sesi')) {
                $table->unsignedInteger('max_penerima_per_sesi')->nullable()->after('istirahat_detik');
            }
            if (!Schema::hasColumn('broadcast', 'jeda_antar_sesi_menit')) {
                $table->unsignedInteger('jeda_antar_sesi_menit')->nullable()->after('max_penerima_per_sesi');
            }
        });
    }

    public function down(): void
    {
        Schema::table('broadcast', function (Blueprint $table) {
            foreach (['interval_detik', 'jeda_setiap_n_pesan', 'istirahat_detik', 'max_penerima_per_sesi', 'jeda_antar_sesi_menit'] as $col) {
                if (Schema::hasColumn('broadcast', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
