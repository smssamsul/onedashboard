<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Saklar global untuk mematikan semua auto follow-up (order, invitation,
     * upselling) sekaligus tanpa harus menonaktifkan tiap template satu-satu.
     * Nullable: NULL/true berarti aktif (perilaku default sebelum kolom ini ada).
     */
    public function up(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('sales_setting', 'auto_followup_enabled')) {
                $table->boolean('auto_followup_enabled')->nullable();
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('sales_setting')) {
            return;
        }

        Schema::table('sales_setting', function (Blueprint $table) {
            if (Schema::hasColumn('sales_setting', 'auto_followup_enabled')) {
                $table->dropColumn('auto_followup_enabled');
            }
        });
    }
};
