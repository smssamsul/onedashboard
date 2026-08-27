<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: sales_setting sekarang baris singleton (dipakai
 * ::first() lewat helper statis di model SalesSetting) - sama seperti
 * ai_setting, menambah kolom ini tidak mengubah perilaku sampai kode
 * pembacanya di-update untuk filter per business_unit_id (fase lanjutan).
 * Baris yang ada sekarang adalah setting Ternak Properti - backfill ke 1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_setting', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('sales_setting')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('sales_setting', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('sales_setting', function (Blueprint $table) {
            if (Schema::hasColumn('sales_setting', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
