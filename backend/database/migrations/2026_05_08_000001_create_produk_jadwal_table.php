<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * produk_jadwal dulunya dibuat dari SQL dump, bukan migration ini - guard
     * hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up()
    {
        if (Schema::hasTable('produk_jadwal')) {
            return;
        }

        Schema::create('produk_jadwal', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('produk_id');
            $table->string('nama_jadwal');
            $table->dateTime('waktu_mulai');
            $table->dateTime('waktu_selesai')->nullable();
            $table->integer('kuota')->nullable();
            $table->string('status', 1)->default('A'); // A: Active, N: Non-active
            $table->timestamps();

            $table->foreign('produk_id')->references('id')->on('produk')->onDelete('cascade');
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down()
    {
        //
    }
};
