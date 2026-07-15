<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (!Schema::hasColumn('ai_setting', 'prompt_cold')) {
                $table->longText('prompt_cold')->nullable()->after('prompt');
            }
            if (!Schema::hasColumn('ai_setting', 'prompt_warm')) {
                $table->longText('prompt_warm')->nullable()->after('prompt_cold');
            }
            if (!Schema::hasColumn('ai_setting', 'is_on')) {
                $table->boolean('is_on')->default(true)->after('woowa_key');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_setting', function (Blueprint $table) {
            if (Schema::hasColumn('ai_setting', 'prompt_cold')) {
                $table->dropColumn('prompt_cold');
            }
            if (Schema::hasColumn('ai_setting', 'prompt_warm')) {
                $table->dropColumn('prompt_warm');
            }
            if (Schema::hasColumn('ai_setting', 'is_on')) {
                $table->dropColumn('is_on');
            }
        });
    }
};
