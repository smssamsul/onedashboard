<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pisah switch "Balasan AI" (is_on, sudah ada) dari switch "Servis Intent
     * AI" (intent_on, baru) - supaya balasan WhatsApp otomatis bisa
     * dimatikan sendiri tanpa ikut menghentikan klasifikasi/skor lead,
     * analisa percakapan, dan analisa Meta Ads. Default true supaya
     * instalasi yang sudah berjalan tidak tiba-tiba kehilangan servis intent
     * begitu migration ini jalan.
     */
    public function up(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('ai_setting', 'intent_on')) {
                $table->boolean('intent_on')->default(true)->after('is_on');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (Schema::hasColumn('ai_setting', 'intent_on')) {
                $table->dropColumn('intent_on');
            }
        });
    }
};
