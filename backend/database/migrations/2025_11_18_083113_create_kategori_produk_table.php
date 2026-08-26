<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Duplikat dari 2024_01_01_000001_create_kategori_produk_table.php (skema
     * kosong, cuma id+timestamps) - tanpa guard ini gagal dengan "relation
     * kategori_produk already exists" begitu dijalankan dari database kosong,
     * karena migration 2024_01_01_000001 sudah membuat tabelnya lebih dulu.
     */
    public function up(): void
    {
        if (Schema::hasTable('kategori_produk')) {
            return;
        }

        Schema::create('kategori_produk', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('kategori_produk');
    }
};
