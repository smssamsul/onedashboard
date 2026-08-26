<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * user dulunya dibuat dari SQL dump, bukan migration ini - guard hasTable()
     * supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('user')) {
            return;
        }

        Schema::create('user', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('email')->unique();
            $table->date('tanggal_lahir')->nullable();
            $table->date('tanggal_join')->nullable();
            $table->text('alamat')->nullable();
            $table->string('divisi')->nullable();
            $table->string('level')->nullable();
            $table->string('no_telp')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
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

