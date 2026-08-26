<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel ai_setting dulunya dibuat dari SQL dump, bukan migration - migration
 * ini rekonstruksi strukturnya supaya reproducible dari kode (lihat CLAUDE.md
 * soal migrate:status yang "Pending"). Struktur di bawah adalah kondisi
 * sebelum 2026_03_06_021750_add_prompt_cold_warm_to_ai_setting_table.php,
 * supaya migration ALTER itu tetap menambah kolomnya seperti seharusnya.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('ai_setting')) {
            return;
        }

        Schema::create('ai_setting', function (Blueprint $table) {
            $table->increments('id');
            $table->text('prompt')->nullable();
            $table->text('woowa_key')->nullable();
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
