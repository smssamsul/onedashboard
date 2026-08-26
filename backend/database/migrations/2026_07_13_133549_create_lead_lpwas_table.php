<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * lead_lpwas dulunya dibuat dari SQL dump, bukan migration ini - guard
     * hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('lead_lpwas')) {
            return;
        }

        Schema::create('lead_lpwas', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->nullable();
            $table->string('no_wa')->nullable();
            $table->unsignedBigInteger('produk_id')->nullable();
            $table->unsignedBigInteger('sales_id')->nullable();
            $table->timestamps();
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
