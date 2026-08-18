<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Lead LPWA sekarang cukup menyimpan produk_text (teks bebas hasil parsing
     * pesan) - produk_id (FK ke katalog produk) tidak dipakai lagi karena
     * webhook tidak lagi memaksa cocok-katalog. Data lama yang masih punya
     * produk_id sudah dibackup manual sebelum migration ini dijalankan.
     */
    public function up(): void
    {
        if (!Schema::hasTable('lead_lpwas')) {
            return;
        }

        Schema::table('lead_lpwas', function (Blueprint $table) {
            if (Schema::hasColumn('lead_lpwas', 'produk_id')) {
                $table->dropColumn('produk_id');
            }
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('lead_lpwas')) {
            return;
        }

        Schema::table('lead_lpwas', function (Blueprint $table) {
            if (!Schema::hasColumn('lead_lpwas', 'produk_id')) {
                $table->unsignedBigInteger('produk_id')->nullable();
            }
        });
    }
};
