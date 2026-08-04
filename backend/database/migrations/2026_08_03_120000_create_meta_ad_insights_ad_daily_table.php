<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Insight harian per IKLAN.
     *
     * Sengaja tabel terpisah, bukan menambah kolom di meta_ad_insights_daily:
     * tabel itu ber-grain campaign, dan mencampur dua grain di satu tabel bikin
     * setiap query harus ingat menyaring "yang mana" — sumber salah hitung yang
     * gampang lolos review.
     *
     * ad_set_id dan campaign_id disimpan meski bisa ditelusuri lewat relasi,
     * supaya agregasi ke ad set / campaign tidak perlu join ke tabel lain.
     */
    public function up(): void
    {
        if (Schema::hasTable('meta_ad_insights_ad_daily')) {
            return;
        }

        Schema::create('meta_ad_insights_ad_daily', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('meta_ads_account_id')->nullable();

            // Id dari Meta disimpan sebagai string — panjang dan bukan angka yang
            // aman dipakai sebagai integer.
            $table->string('ad_id', 64);
            $table->string('ad_set_id', 64)->nullable();
            $table->string('campaign_id', 64)->nullable();
            $table->date('date');

            $table->decimal('spend', 15, 2)->default(0);
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->unsignedBigInteger('link_clicks')->nullable();
            $table->decimal('cpc', 15, 4)->nullable();
            $table->decimal('cpm', 15, 4)->nullable();
            $table->decimal('ctr', 10, 4)->nullable();

            $table->integer('conversions')->nullable();
            $table->integer('leads')->nullable();
            $table->integer('contact')->nullable();
            $table->decimal('conversion_value', 15, 2)->nullable();
            $table->json('raw_actions')->nullable();

            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();

            // Satu baris per iklan per hari; sync memakai updateOrCreate atas ini.
            $table->unique(['ad_id', 'date']);
            $table->index(['campaign_id', 'date']);
            $table->index(['ad_set_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ad_insights_ad_daily');
    }
};
