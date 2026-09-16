<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('percakapan', function (Blueprint $table) {
            if (!Schema::hasColumn('percakapan', 'ai_analysis')) {
                $table->text('ai_analysis')->nullable()->after('lead_score');
            }
            if (!Schema::hasColumn('percakapan', 'ai_analysis_at')) {
                $table->timestamp('ai_analysis_at')->nullable()->after('ai_analysis');
            }
        });
    }

    public function down(): void
    {
        Schema::table('percakapan', function (Blueprint $table) {
            if (Schema::hasColumn('percakapan', 'ai_analysis')) {
                $table->dropColumn('ai_analysis');
            }
            if (Schema::hasColumn('percakapan', 'ai_analysis_at')) {
                $table->dropColumn('ai_analysis_at');
            }
        });
    }
};
