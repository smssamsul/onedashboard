<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * produk dulunya dibuat dari SQL dump, bukan migration ini - guard hasTable()
     * supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('produk')) {
            return;
        }

        Schema::create('produk', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kategori')->constrained('kategori_produk')->onDelete('cascade');
            $table->foreignId('user_input')->constrained('user')->onDelete('cascade');
            $table->string('kode')->unique();
            $table->string('nama');
            $table->string('url')->nullable();
            $table->text('header')->nullable();
            $table->decimal('harga_coret', 15, 2)->nullable();
            $table->decimal('harga_asli', 15, 2)->nullable();
            $table->text('deskripsi')->nullable();
            $table->date('tanggal_event')->nullable();
            $table->json('gambar')->nullable();
            $table->string('landingpage')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
            $table->json('assign')->nullable();
            $table->json('custom_field')->nullable();
            $table->json('list_point')->nullable();
            $table->json('testimoni')->nullable();
            $table->json('fb_pixel')->nullable();
            $table->json('event_fb_pixel')->nullable();
            $table->json('gtm')->nullable();
            $table->json('video')->nullable();
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};

