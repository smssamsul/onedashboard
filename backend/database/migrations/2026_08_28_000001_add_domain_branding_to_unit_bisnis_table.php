<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: unit_bisnis butuh domain (app.<brand>.com) dan
 * branding (logo/tema) supaya frontend multi-brand bisa dibangun di atasnya
 * nanti. Lihat dokumen "Peta Jalan Boosterin".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_bisnis', function (Blueprint $table) {
            if (!Schema::hasColumn('unit_bisnis', 'domain')) {
                $table->string('domain')->nullable()->unique()->after('slug');
            }
            if (!Schema::hasColumn('unit_bisnis', 'branding')) {
                $table->json('branding')->nullable()->after('domain');
            }
        });
    }

    public function down(): void
    {
        Schema::table('unit_bisnis', function (Blueprint $table) {
            if (Schema::hasColumn('unit_bisnis', 'branding')) {
                $table->dropColumn('branding');
            }
            if (Schema::hasColumn('unit_bisnis', 'domain')) {
                $table->dropColumn('domain');
            }
        });
    }
};
