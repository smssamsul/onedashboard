<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * order_customer_arsip dulunya dibuat dari SQL dump, bukan migration ini -
     * guard hasTable() supaya aman dijalankan di database yang tabelnya sudah
     * ada. (Nama file pakai "arsips", tabel sungguhannya "arsip" tanpa s.)
     */
    public function up(): void
    {
        if (Schema::hasTable('order_customer_arsip')) {
            return;
        }

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
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};
