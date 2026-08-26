<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * sales dulunya dibuat dari SQL dump, bukan migration ini - guard hasTable()
     * supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up()
    {
        if (Schema::hasTable('sales')) {
            return;
        }

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->nullable();
            $table->string('woowa_key', 150)->nullable();
            $table->string('urutan', 150)->nullable();
            $table->string('last_update_lead', 20)->nullable();
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down()
    {
        //
    }
};

