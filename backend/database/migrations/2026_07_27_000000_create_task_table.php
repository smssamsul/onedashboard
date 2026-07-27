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
        if (Schema::hasTable('task')) {
            return;
        }

        Schema::create('task', function (Blueprint $table) {
            $table->id();
            // FK manual (bukan ->constrained()) karena hr_karyawan adalah tabel legacy
            // yang tidak dikelola migration Laravel.
            $table->unsignedBigInteger('hr_karyawan_id'); // pemilik/pengerja task
            $table->unsignedBigInteger('dibuat_oleh'); // hr_karyawan yang membuat/assign task ini
            $table->string('judul', 200);
            $table->text('deskripsi')->nullable();
            $table->string('status', 20)->default('belum_mulai'); // belum_mulai / berjalan / selesai
            $table->unsignedTinyInteger('persentase_penyelesaian')->default(0); // 0-100
            $table->string('status_persetujuan', 20)->nullable(); // null / menunggu / disetujui / ditolak (ringkasan)
            $table->date('tenggat')->nullable();
            $table->timestamp('tanggal_selesai')->nullable();
            $table->timestamps();

            $table->index('hr_karyawan_id');
            $table->index('dibuat_oleh');
            $table->index('status_persetujuan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task');
    }
};
