<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pixel iklan ChatGPT (OpenAI Ads) - terpisah dari pixel_meta (Facebook)
     * karena format ID, SDK, dan Conversions API-nya berbeda total.
     * Produk yang memakai pixel ini diatur di sini (semua_produk / produk_ids),
     * bukan di form produk, supaya form produk tidak perlu diubah.
     */
    public function up(): void
    {
        if (Schema::hasTable('openai_pixels')) {
            return;
        }

        Schema::create('openai_pixels', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('pixel_id');
            // Conversions API key - disimpan terenkripsi (cast 'encrypted' di model).
            $table->text('capi_key')->nullable();
            $table->boolean('semua_produk')->default(true);
            $table->json('produk_ids')->nullable();
            $table->boolean('aktif')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('openai_pixels');
    }
};
