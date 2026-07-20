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
        // hr_karyawan dibuat dari SQL dump lama, bukan migration - guard dulu
        Schema::table('hr_karyawan', function (Blueprint $table) {
            if (!Schema::hasColumn('hr_karyawan', 'posisi_x')) {
                $table->double('posisi_x')->nullable()->after('approval');
            }
            if (!Schema::hasColumn('hr_karyawan', 'posisi_y')) {
                $table->double('posisi_y')->nullable()->after('posisi_x');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('hr_karyawan', function (Blueprint $table) {
            if (Schema::hasColumn('hr_karyawan', 'posisi_y')) {
                $table->dropColumn('posisi_y');
            }
            if (Schema::hasColumn('hr_karyawan', 'posisi_x')) {
                $table->dropColumn('posisi_x');
            }
        });
    }
};
