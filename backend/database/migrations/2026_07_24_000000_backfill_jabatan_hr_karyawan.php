<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Sederhanakan taksonomi jabatan dari 8 tingkat jadi 4: Staff, Manager,
 * General Manager, Direksi. Pemetaan kode lama -> baru:
 *   1 Vice President           -> 4 Direksi
 *   2 Assistant Vice President -> 4 Direksi
 *   3 General Manager          -> 3 General Manager
 *   4 Manager                  -> 2 Manager
 *   5 Supervisor                -> 2 Manager
 *   6 Officer                   -> 1 Staff
 *   7 Clerical Staff            -> 1 Staff
 *   8 Internship                 -> 1 Staff
 *
 * Backup baris hr_karyawan (id, nama, departemen, jabatan) sebelum migration ini
 * dijalankan tersimpan di backend/storage/app/backups/hr_karyawan_jabatan_backup_*.csv
 */
return new class extends Migration
{
    public function up(): void
    {
        // Rentang kode lama (1-8) dan baru (1-4) tumpang tindih, jadi update langsung
        // berisiko tabrakan (mis. baris kode-lama-4 ketiban update dari langkah kode-lama-2->4).
        // Aman: geser dulu semua kode lama ke rentang staging (101-108) yang tidak tumpang
        // tindih dengan kode manapun, baru dari situ dipetakan ke kode final 1-4.
        DB::table('hr_karyawan')->where('jabatan', 1)->update(['jabatan' => 101]); // Vice President
        DB::table('hr_karyawan')->where('jabatan', 2)->update(['jabatan' => 102]); // Assistant Vice President
        DB::table('hr_karyawan')->where('jabatan', 3)->update(['jabatan' => 103]); // General Manager
        DB::table('hr_karyawan')->where('jabatan', 4)->update(['jabatan' => 104]); // Manager
        DB::table('hr_karyawan')->where('jabatan', 5)->update(['jabatan' => 105]); // Supervisor
        DB::table('hr_karyawan')->where('jabatan', 6)->update(['jabatan' => 106]); // Officer
        DB::table('hr_karyawan')->where('jabatan', 7)->update(['jabatan' => 107]); // Clerical Staff
        DB::table('hr_karyawan')->where('jabatan', 8)->update(['jabatan' => 108]); // Internship

        DB::table('hr_karyawan')->whereIn('jabatan', [101, 102])->update(['jabatan' => 4]); // -> Direksi
        DB::table('hr_karyawan')->where('jabatan', 103)->update(['jabatan' => 3]); // -> General Manager
        DB::table('hr_karyawan')->whereIn('jabatan', [104, 105])->update(['jabatan' => 2]); // -> Manager
        DB::table('hr_karyawan')->whereIn('jabatan', [106, 107, 108])->update(['jabatan' => 1]); // -> Staff
    }

    public function down(): void
    {
        // Tidak ada nilai lama yang tersimpan untuk di-rollback secara akurat;
        // down() sengaja dibiarkan no-op. Backup CSV tersedia untuk restore manual jika perlu.
    }
};
