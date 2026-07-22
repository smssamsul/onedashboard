<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Produk seminar tertentu dipakai berulang dengan jadwal (produk_jadwal) yang
     * SAMA barisnya, cuma tanggalnya di-update tiap ada sesi baru. Kalau kehadiran
     * cuma nyimpen jadwal_id (FK hidup ke produk_jadwal), begitu tanggal jadwal
     * diubah untuk sesi berikutnya, kehadiran LAMA otomatis "ikut pindah" ke tanggal
     * baru itu juga (karena join-nya live, bukan snapshot) — riwayat historis rusak.
     *
     * Migration ini nge-freeze produk_id + tanggal jadwal + nama jadwal pada saat
     * check-in terjadi, supaya riwayat kehadiran tidak berubah walau produk_jadwal
     * induknya diedit ulang untuk sesi baru.
     */
    public function up(): void
    {
        Schema::table('produk_jadwal_kehadiran', function (Blueprint $table) {
            $table->unsignedBigInteger('produk_id')->nullable()->after('jadwal_id');
            $table->timestamp('tanggal_jadwal')->nullable()->after('produk_id');
            $table->string('nama_jadwal_snapshot')->nullable()->after('tanggal_jadwal');
        });

        // Backfill data lama dari kondisi jadwal saat ini (best-effort, karena data lama
        // belum punya snapshot — hanya berlaku untuk baris yang sudah ada sebelum migration ini).
        DB::statement("
            UPDATE produk_jadwal_kehadiran k
            SET produk_id = pj.produk_id,
                tanggal_jadwal = pj.waktu_mulai,
                nama_jadwal_snapshot = pj.nama_jadwal
            FROM produk_jadwal pj
            WHERE k.jadwal_id = pj.id
        ");

        DB::statement('ALTER TABLE produk_jadwal_kehadiran ALTER COLUMN produk_id SET NOT NULL');
        DB::statement('ALTER TABLE produk_jadwal_kehadiran ALTER COLUMN tanggal_jadwal SET NOT NULL');

        Schema::table('produk_jadwal_kehadiran', function (Blueprint $table) {
            $table->foreign('produk_id')->references('id')->on('produk')->onDelete('cascade');
        });

        // Ganti unique constraint: sertakan tanggal_jadwal supaya jadwal_id yang dipakai
        // ulang dengan tanggal baru dianggap sesi berbeda (customer boleh check-in lagi).
        DB::statement('ALTER TABLE produk_jadwal_kehadiran DROP CONSTRAINT IF EXISTS uq_kehadiran_jadwal_customer');
        DB::statement('ALTER TABLE produk_jadwal_kehadiran ADD CONSTRAINT uq_kehadiran_jadwal_customer_tanggal UNIQUE (jadwal_id, customer_id, tanggal_jadwal)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE produk_jadwal_kehadiran DROP CONSTRAINT IF EXISTS uq_kehadiran_jadwal_customer_tanggal');
        DB::statement('ALTER TABLE produk_jadwal_kehadiran ADD CONSTRAINT uq_kehadiran_jadwal_customer UNIQUE (jadwal_id, customer_id)');

        Schema::table('produk_jadwal_kehadiran', function (Blueprint $table) {
            $table->dropForeign(['produk_id']);
            $table->dropColumn(['produk_id', 'tanggal_jadwal', 'nama_jadwal_snapshot']);
        });
    }
};
