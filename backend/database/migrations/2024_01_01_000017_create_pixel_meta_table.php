<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel pixel_meta dulunya dibuat dari SQL dump, bukan migration - migration
 * ini rekonstruksi strukturnya supaya reproducible dari kode. Kolom
 * nama/conversion_api_token/kode_testing sengaja tidak dimasukkan di sini
 * karena ditambahkan lewat 2026_07_05_000000_add_columns_to_pixel_meta_table.php
 * (migration itu tidak ada guard hasColumn, jadi kolomnya harus benar-benar
 * belum ada saat migration itu jalan).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('pixel_meta')) {
            return;
        }

        Schema::create('pixel_meta', function (Blueprint $table) {
            $table->increments('id');
            $table->text('pixel')->nullable();
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
