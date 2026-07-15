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
        Schema::create('order_customer_arsip', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->unsignedBigInteger('produk_id')->nullable();
            $table->string('produk_nama_manual')->nullable();
            $table->string('harga')->nullable();
            $table->string('status_pembayaran')->nullable();
            $table->string('status_order')->nullable();
            $table->string('sumber')->nullable();
            $table->timestamp('tanggal')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('customer')->onDelete('cascade');
            $table->foreign('produk_id')->references('id')->on('produk')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_customer_arsip');
    }
};
