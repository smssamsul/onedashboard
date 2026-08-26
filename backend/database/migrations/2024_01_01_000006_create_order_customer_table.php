<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * order_customer dulunya dibuat dari SQL dump, bukan migration ini - migration
     * ini ditulis belakangan untuk merekonstruksi strukturnya tapi sempat tidak
     * lengkap (status_pembayaran, catatan, bundling hilang), jadi query yang
     * menyentuh kolom itu gagal begitu dijalankan dari database kosong. Guard
     * hasTable() ditambah supaya juga aman dijalankan di DB yang tabelnya
     * sudah ada (migration ini sendiri belum pernah tercatat "ran" di manapun).
     */
    public function up(): void
    {
        if (Schema::hasTable('order_customer')) {
            return;
        }

        Schema::create('order_customer', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer')->constrained('customer')->onDelete('cascade');
            $table->foreignId('produk')->constrained('produk')->onDelete('cascade');
            $table->date('tanggal')->nullable();
            $table->decimal('harga', 15, 2)->nullable();
            $table->decimal('ongkir', 15, 2)->nullable();
            $table->decimal('total_harga', 15, 2)->nullable();
            $table->text('alamat')->nullable();
            $table->string('sumber')->nullable();
            $table->timestamp('waktu_pembayaran')->nullable();
            $table->string('bukti_pembayaran')->nullable();
            $table->string('metode_bayar')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
            $table->string('status_pembayaran')->nullable();
            $table->string('status_order')->nullable();
            $table->text('custom_value')->nullable();
            $table->text('catatan')->nullable();
            $table->string('bundling', 50)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_customer');
    }
};

