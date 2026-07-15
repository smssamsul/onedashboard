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
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produk');
    }
};

