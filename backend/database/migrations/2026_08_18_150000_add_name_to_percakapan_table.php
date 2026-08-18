<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Percakapan sekarang punya nama sendiri (dari senderName WhatsApp),
     * tidak lagi membaca nama customer lewat relasi ke ai_leads.
     */
    public function up(): void
    {
        if (!Schema::hasTable('percakapan')) {
            return;
        }

        Schema::table('percakapan', function (Blueprint $table) {
            if (!Schema::hasColumn('percakapan', 'name')) {
                $table->string('name')->nullable()->after('phone_number');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('percakapan')) {
            return;
        }

        Schema::table('percakapan', function (Blueprint $table) {
            if (Schema::hasColumn('percakapan', 'name')) {
                $table->dropColumn('name');
            }
        });
    }
};
