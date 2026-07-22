<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Upselling (type 8) sekarang dipicu oleh kehadiran (produk_jadwal_kehadiran),
     * bukan lagi order/invitation langsung — kolom ini jadi kunci dedup utamanya
     * supaya H+ dihitung per baris kehadiran (per jadwal yang benar-benar dihadiri).
     */
    public function up(): void
    {
        Schema::table('logs_follup', function (Blueprint $table) {
            $table->unsignedBigInteger('kehadiran')->nullable()->after('invitation');
            $table->foreign('kehadiran')->references('id')->on('produk_jadwal_kehadiran')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('logs_follup', function (Blueprint $table) {
            $table->dropForeign(['kehadiran']);
            $table->dropColumn('kehadiran');
        });
    }
};
