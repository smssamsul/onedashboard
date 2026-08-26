<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sales_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_setting', 'wa_engine')) {
                $table->string('wa_engine', 20)->default('woowa')->after('woowa_utama')
                    ->comment('Engine WA yang digunakan: woowa atau baileys');
            }
        });
    }

    /**
     * Sengaja no-op: kolomnya kemungkinan sudah ada sebelum migration ini
     * dijalankan (bukan dibuat olehnya), jadi down() tidak boleh drop kolom
     * begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};
