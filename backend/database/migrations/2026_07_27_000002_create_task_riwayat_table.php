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
        if (Schema::hasTable('task_riwayat')) {
            return;
        }

        Schema::create('task_riwayat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('task')->onDelete('cascade');
            // FK manual ke hr_karyawan (tabel legacy, tidak dikelola migration).
            $table->unsignedBigInteger('hr_karyawan_id'); // pelaku perubahan
            $table->string('aksi', 30); // dibuat / disetujui_jenjang / ditolak / status_diubah / progres_diperbarui
            $table->text('keterangan')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('task_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_riwayat');
    }
};
