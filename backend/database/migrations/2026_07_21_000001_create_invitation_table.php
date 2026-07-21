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
        Schema::create('invitation', function (Blueprint $table) {
            $table->id();
            $table->string('kode_invitation', 32)->unique();
            $table->foreignId('customer')->constrained('customer')->onDelete('cascade');
            $table->foreignId('produk')->constrained('produk')->onDelete('cascade');
            $table->foreignId('jadwal_id')->nullable()->constrained('produk_jadwal')->onDelete('set null');
            $table->foreignId('referral_customer')->nullable()->constrained('customer')->onDelete('set null');
            $table->foreignId('create_by')->nullable()->constrained('user')->onDelete('set null');
            $table->string('sumber')->nullable();
            $table->string('utm_source')->nullable();
            $table->string('utm_medium')->nullable();
            $table->string('utm_campaign')->nullable();
            $table->string('utm_term')->nullable();
            $table->string('utm_content')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invitation');
    }
};
