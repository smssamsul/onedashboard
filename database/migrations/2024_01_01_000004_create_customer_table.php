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
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer');
    }
};

