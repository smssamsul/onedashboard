<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel sales_setting dulunya dibuat dari SQL dump, bukan migration -
 * migration ini rekonstruksi strukturnya supaya reproducible dari kode.
 * Kolom wa_engine, followup_delay_min/max, baileys_quota_*, dan
 * auto_followup_enabled sengaja tidak dimasukkan di sini karena masing-masing
 * ditambahkan lewat migration ALTER terpisah
 * (2026_07_12, 2026_08_03, 2026_08_11, 2026_08_18).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::create('sales_setting', function (Blueprint $table) {
            $table->increments('id');
            $table->text('token_google')->nullable();
            $table->text('woowa_utama')->nullable();
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};
