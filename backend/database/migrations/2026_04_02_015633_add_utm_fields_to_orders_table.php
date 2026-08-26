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
        Schema::table('order_customer', function (Blueprint $table) {
            if (!Schema::hasColumn('order_customer', 'utm_source')) {
                $table->string('utm_source')->nullable()->after('catatan');
            }
            if (!Schema::hasColumn('order_customer', 'utm_medium')) {
                $table->string('utm_medium')->nullable()->after('utm_source');
            }
            if (!Schema::hasColumn('order_customer', 'utm_campaign')) {
                $table->string('utm_campaign')->nullable()->after('utm_medium');
            }
            if (!Schema::hasColumn('order_customer', 'utm_term')) {
                $table->string('utm_term')->nullable()->after('utm_campaign');
            }
            if (!Schema::hasColumn('order_customer', 'utm_content')) {
                $table->string('utm_content')->nullable()->after('utm_term');
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
