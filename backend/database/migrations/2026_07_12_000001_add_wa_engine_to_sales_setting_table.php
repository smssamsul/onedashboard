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
        Schema::table('sales_setting', function (Blueprint $table) {
            $table->string('wa_engine', 20)->default('woowa')->after('woowa_utama')
                ->comment('Engine WA yang digunakan: woowa atau baileys');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_setting', function (Blueprint $table) {
            $table->dropColumn('wa_engine');
        });
    }
};
