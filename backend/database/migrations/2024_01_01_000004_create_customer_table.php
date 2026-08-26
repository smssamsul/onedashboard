<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * customer dulunya dibuat dari SQL dump, bukan migration ini - guard
     * hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('customer')) {
            return;
        }

        Schema::create('customer', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('nama_panggilan')->nullable();
            $table->string('email')->unique();
            $table->string('instagram')->nullable();
            $table->string('password');
            $table->string('wa')->nullable();
            $table->string('profesi')->nullable();
            $table->decimal('pendapatan_bln', 15, 2)->nullable();
            $table->string('industri_pekerjaan')->nullable();
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->text('alamat')->nullable();
            $table->string('status_order')->nullable();
            $table->string('verifikasi')->default('0');
            $table->text('alasan_tertarik')->nullable();
            $table->text('alasan_belum')->nullable();
            $table->text('harapan')->nullable();
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

