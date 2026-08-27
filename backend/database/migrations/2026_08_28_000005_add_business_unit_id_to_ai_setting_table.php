<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 1 tenant first-class: ai_setting sekarang baris singleton (dipakai
 * ::first() tanpa filter oleh WoowaService, WhatsAppFlowService,
 * OpenAIChatService, ClaudeChatService, AiSettingController,
 * AiSimulasiController) - menambah kolom ini TIDAK mengubah perilaku sampai
 * kode pembacanya di-update untuk filter per business_unit_id (fase lanjutan).
 * Baris yang ada sekarang adalah config Ternak Properti - backfill ke 1.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('ai_setting', 'business_unit_id')) {
                $table->foreignId('business_unit_id')->nullable()->after('id')->constrained('unit_bisnis');
            }
        });

        DB::table('ai_setting')->whereNull('business_unit_id')->update(['business_unit_id' => 1]);

        Schema::table('ai_setting', function (Blueprint $table) {
            $table->foreignId('business_unit_id')->default(1)->nullable(false)->change();
        });
    }

    public function down(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (Schema::hasColumn('ai_setting', 'business_unit_id')) {
                $table->dropConstrainedForeignId('business_unit_id');
            }
        });
    }
};
