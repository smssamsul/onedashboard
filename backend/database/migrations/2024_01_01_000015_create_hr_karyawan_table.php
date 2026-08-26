<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel hr_karyawan dulunya dibuat dari SQL dump, bukan migration - migration
 * ini rekonstruksi strukturnya supaya reproducible dari kode. Kolom
 * posisi_x/posisi_y sengaja tidak dimasukkan di sini karena ditambahkan lewat
 * 2026_07_20_000000_add_posisi_canvas_to_hr_karyawan_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('hr_karyawan')) {
            return;
        }

        Schema::create('hr_karyawan', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id')->nullable();
            $table->string('nama', 150);
            $table->string('jenis_kelamin', 10)->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->string('notelp', 50)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('tanggal_join', 20);
            $table->string('tanggal_resign', 20)->nullable();
            $table->string('status_karyawan', 50)->nullable();
            $table->integer('departemen')->nullable();
            $table->integer('jabatan')->nullable();
            $table->integer('shift')->nullable();
            $table->text('alamat')->nullable();
            $table->text('avatar_url')->nullable();
            $table->string('status', 1)->nullable();
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();
            $table->integer('kuota_cuti')->nullable();
            $table->integer('approval')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hr_karyawan');
    }
};
