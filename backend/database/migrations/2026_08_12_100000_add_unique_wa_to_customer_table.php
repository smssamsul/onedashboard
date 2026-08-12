<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Nomor WA jadi identitas unik customer (bukan email - email sekarang
     * boleh kosong). Partial index: cuma customer AKTIF (status != 'N')
     * yang wajib unik, supaya data lama yang di-nonaktifkan lewat
     * `customer:merge-duplicate-wa` tidak mengunci nomor itu selamanya.
     *
     * PENTING: jalankan `php artisan customer:merge-duplicate-wa` dulu
     * sebelum migration ini - kalau masih ada wa aktif yang duplikat,
     * pembuatan index bakal gagal.
     */
    public function up(): void
    {
        if (!Schema::hasTable('customer')) {
            return;
        }

        DB::statement(
            "CREATE UNIQUE INDEX IF NOT EXISTS customer_wa_active_unique
             ON customer (wa)
             WHERE status != 'N' AND wa IS NOT NULL AND wa != ''"
        );
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS customer_wa_active_unique');
    }
};
