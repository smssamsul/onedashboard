<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kuota kirim pesan per session Baileys (bukan per aplikasi/global) -
     * dipakai buat menahan laju kirim biar tidak dianggap spam/bot oleh
     * WhatsApp (session sering ke-logout paksa akibat kirim terlalu cepat).
     * Nullable: NULL berarti "pakai default kode" (20 pesan / 30 menit).
     */
    public function up(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_setting', 'baileys_quota_max_messages')) {
                $table->unsignedInteger('baileys_quota_max_messages')->nullable();
            }
            if (!Schema::hasColumn('sales_setting', 'baileys_quota_window_minutes')) {
                $table->unsignedInteger('baileys_quota_window_minutes')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (Schema::hasColumn('sales_setting', 'baileys_quota_max_messages')) {
                $table->dropColumn('baileys_quota_max_messages');
            }
            if (Schema::hasColumn('sales_setting', 'baileys_quota_window_minutes')) {
                $table->dropColumn('baileys_quota_window_minutes');
            }
        });
    }
};
