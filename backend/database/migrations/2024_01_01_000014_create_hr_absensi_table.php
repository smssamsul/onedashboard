<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel hr_absensi dulunya dibuat dari SQL dump, bukan migration - migration
 * ini rekonstruksi strukturnya supaya reproducible dari kode. Kolom emosi
 * sengaja tidak dimasukkan di sini karena ditambahkan lewat
 * 2026_03_06_040524_add_emosi_to_hr_absensi_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hr_absensi')) {
            return;
        }

        Schema::create('hr_absensi', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('karyawan')->nullable();
            $table->string('tanggal', 10);
            $table->string('check_in', 20)->nullable();
            $table->string('check_out', 20)->nullable();
            $table->integer('shift')->nullable();
            $table->string('status_absensi', 30)->nullable();
            $table->text('check_in_photo')->nullable();
            $table->text('check_out_photo')->nullable();
            $table->string('lat_check_in', 60)->nullable();
            $table->string('long_check_in', 60)->nullable();
            $table->string('lat_check_out', 60)->nullable();
            $table->string('long_check_out', 60)->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 1)->nullable();
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_absensi');
    }
};
