<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel order_payments dulunya dibuat dari SQL dump, bukan migration -
 * migration ini rekonstruksi strukturnya supaya reproducible dari kode.
 * Kolom nama_pengirim/no_rek_pengirim sengaja tidak dimasukkan di sini
 * karena ditambahkan lewat
 * 2026_04_25_000001_add_sender_fields_to_order_payments_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('order_payments')) {
            return;
        }

        Schema::create('order_payments', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('order_id')->nullable();
            $table->decimal('amount', 15, 2)->nullable();
            $table->integer('payment_ke')->nullable();
            $table->string('payment_method', 50)->nullable();
            $table->string('payment_type', 20)->nullable();
            $table->date('tanggal')->nullable();
            $table->text('bukti_pembayaran')->nullable();
            $table->char('status', 2)->nullable();
            $table->text('catatan')->nullable();
            $table->timestamp('create_at')->nullable()->useCurrent();
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down(): void
    {
        //
    }
};
