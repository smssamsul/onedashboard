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
        Schema::table('lead_lpwas', function (Blueprint $table) {
            $table->string('produk_text')->nullable()->after('produk_id');
            $table->string('lokasi')->nullable()->after('produk_text');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_lpwas', function (Blueprint $table) {
            $table->dropColumn(['produk_text', 'lokasi']);
        });
    }
};
