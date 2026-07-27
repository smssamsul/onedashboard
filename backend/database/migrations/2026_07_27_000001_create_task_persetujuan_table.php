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
        if (Schema::hasTable('task_persetujuan')) {
            return;
        }

        Schema::create('task_persetujuan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained('task')->onDelete('cascade');
            // FK manual ke hr_karyawan (tabel legacy, tidak dikelola migration).
            $table->unsignedBigInteger('hr_karyawan_id'); // approver di jenjang ini
            $table->unsignedInteger('jenjang'); // 1 = atasan langsung pemilik task, 2 = atasan dari jenjang 1, dst
            $table->string('status', 20)->default('menunggu'); // menunggu / disetujui / ditolak
            $table->text('catatan')->nullable();
            $table->timestamp('diputuskan_pada')->nullable();
            $table->timestamps();

            $table->unique(['task_id', 'jenjang']);
            $table->index('hr_karyawan_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('task_persetujuan');
    }
};
