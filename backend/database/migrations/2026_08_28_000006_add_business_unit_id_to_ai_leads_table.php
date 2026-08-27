<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: semua AI lead yang ada sekarang adalah leads
 * Ternak Properti - backfill ke business_unit_id = 1 akurat secara historis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_leads', function (Blueprint $table) {
            if (!Schema::hasColumn('ai_leads', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('ai_leads')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('ai_leads', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_leads', function (Blueprint $table) {
            if (Schema::hasColumn('ai_leads', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
