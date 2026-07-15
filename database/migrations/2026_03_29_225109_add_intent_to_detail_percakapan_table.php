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
        Schema::table('detail_percakapan', function (Blueprint $table) {
            $table->string('intent')->nullable()->after('message_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('detail_percakapan', function (Blueprint $table) {
            $table->dropColumn('intent');
        });
    }
};
