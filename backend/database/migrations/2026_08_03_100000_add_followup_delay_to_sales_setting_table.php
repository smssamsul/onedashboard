<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jeda acak antar pesan follow-up, dipindah dari .env ke DB supaya bisa
     * diatur dari halaman Setting Sales tanpa perlu deploy ulang.
     * Nullable: NULL berarti "ikut nilai .env" (perilaku lama tetap jalan).
     */
    public function up(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_setting', 'followup_delay_min')) {
                $table->unsignedInteger('followup_delay_min')->nullable();
            }
            if (!Schema::hasColumn('sales_setting', 'followup_delay_max')) {
                $table->unsignedInteger('followup_delay_max')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (Schema::hasColumn('sales_setting', 'followup_delay_min')) {
                $table->dropColumn('followup_delay_min');
            }
            if (Schema::hasColumn('sales_setting', 'followup_delay_max')) {
                $table->dropColumn('followup_delay_max');
            }
        });
    }
};
