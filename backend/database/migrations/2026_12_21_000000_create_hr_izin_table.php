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
        // Jika tabel sudah ada (dibuat manual), jangan error saat migrate
        if (Schema::hasTable('hr_izin')) {
            return;
        }

        Schema::create('hr_izin', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('karyawan');
            $table->string('jenis_izin', 50); // WFH, izin_telat, izin_sakit
            $table->date('tanggal'); // Untuk izin telat dan izin sakit
            $table->date('tanggal_mulai')->nullable(); // Untuk WFH
            $table->date('tanggal_akhir')->nullable(); // Untuk WFH
            $table->time('jam_mulai')->nullable(); // Untuk izin telat
            $table->text('alasan');
            $table->string('status_izin', 20)->default('pending'); // pending, approved, rejected
            $table->unsignedBigInteger('approved_by')->nullable(); // FK ke hr_karyawan
            $table->text('catatan_approval')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->string('status', 1)->default('1'); // Soft delete
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();

            $table->index(['karyawan', 'status_izin']);
            $table->index(['tanggal', 'jenis_izin']);
            $table->index(['tanggal_mulai', 'tanggal_akhir']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hr_izin');
    }
};
