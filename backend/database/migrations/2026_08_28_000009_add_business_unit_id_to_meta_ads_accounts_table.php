<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: semua akun Meta Ads yang ada sekarang dipakai
 * Ternak Properti - backfill ke business_unit_id = 1 akurat secara historis.
 *
 * Catatan penting: tabel ini SUDAH punya kolom "business_id" - itu ID
 * Business Manager Meta/Facebook (properti pihak ketiga), bukan konsep
 * tenant kita. "business_unit_id" di migration ini adalah kolom terpisah
 * untuk konsep unit bisnis internal - jangan tertukar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_ads_accounts', function (Blueprint $table) {
            if (!Schema::hasColumn('meta_ads_accounts', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('meta_ads_accounts')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('meta_ads_accounts', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('meta_ads_accounts', function (Blueprint $table) {
            if (Schema::hasColumn('meta_ads_accounts', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
