<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_ad_insights_daily', function (Blueprint $table) {
            // Metrik tambahan dari array `actions` Meta yang belum di-cache:
            // leads (form/pixel lead) & contact (termasuk messaging conversation started).
            // Purchase tetap pakai kolom `conversions` yang sudah ada.
            $table->bigInteger('leads')->nullable()->after('conversions');
            $table->bigInteger('contact')->nullable()->after('leads');
        });
    }

    public function down(): void
    {
        Schema::table('meta_ad_insights_daily', function (Blueprint $table) {
            $table->dropColumn(['leads', 'contact']);
        });
    }
};
