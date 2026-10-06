<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meta_ad_sets', function (Blueprint $table) {
            $table->string('destination_type')->nullable()->after('optimization_goal');
        });
    }

    public function down(): void
    {
        Schema::table('meta_ad_sets', function (Blueprint $table) {
            $table->dropColumn('destination_type');
        });
    }
};
