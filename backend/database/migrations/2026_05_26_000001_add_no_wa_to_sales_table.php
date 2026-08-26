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
        Schema::table('sales', function (Blueprint $table) {
            if (!Schema::hasColumn('sales', 'no_wa')) {
                $table->string('no_wa', 20)->nullable()->after('woowa_key');
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
