<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * customer_followups dulunya dibuat dari SQL dump, bukan migration ini -
     * guard hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up(): void
    {
        if (Schema::hasTable('customer_followups')) {
            return;
        }

        Schema::create('customer_followups', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->string('via')->nullable();
            $table->string('respon')->nullable();
            $table->text('keterangan')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();

            $table->foreign('customer_id')->references('id')->on('customer')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('user')->onDelete('set null');
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
