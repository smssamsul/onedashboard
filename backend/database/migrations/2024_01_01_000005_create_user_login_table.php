<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * user_login dulunya dibuat dari SQL dump, bukan migration ini - guard
     * hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('user_login')) {
            return;
        }

        Schema::create('user_login', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password');
            $table->foreignId('user')->constrained('user')->onDelete('cascade');
            $table->string('token')->nullable();
            $table->timestamp('email_verified_at')->nullable();
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

