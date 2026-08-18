<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lini/unit bisnis produk (Ternak Properti, AKR, Pertanahan, dst) -
     * dipakai untuk filter halaman jadwal-seminar publik per unit bisnis
     * (/product/jadwal-seminar/{slug}). Struktur sengaja disamakan dengan
     * kategori_produk (create_at/update_at manual, status 'N' = nonaktif).
     */
    public function up(): void
    {
        Schema::create('unit_bisnis', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('slug')->unique();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_bisnis');
    }
};
