<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: semua order yang ada sekarang adalah data
 * Ternak Properti - backfill ke business_unit_id = 1 akurat secara historis.
 * DEFAULT 1 dipertahankan supaya kode yang belum di-update (OrderCustomerController)
 * tetap jalan normal, bukan error.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_customer', function (Blueprint $table) {
            if (!Schema::hasColumn('order_customer', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('order_customer')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('order_customer', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('order_customer', function (Blueprint $table) {
            if (Schema::hasColumn('order_customer', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
