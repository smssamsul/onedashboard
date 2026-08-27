<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: semua template follow-up yang ada sekarang
 * adalah template Ternak Properti - backfill ke business_unit_id = 1
 * akurat secara historis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('template_follup', function (Blueprint $table) {
            if (!Schema::hasColumn('template_follup', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('template_follup')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('template_follup', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('template_follup', function (Blueprint $table) {
            if (Schema::hasColumn('template_follup', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
