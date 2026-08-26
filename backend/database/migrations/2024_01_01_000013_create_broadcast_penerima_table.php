<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel broadcast_penerima dulunya dibuat dari SQL dump, bukan migration -
 * migration ini rekonstruksi strukturnya supaya reproducible dari kode.
 * Kolom customer dibuat NOT NULL di sini karena
 * 2026_06_15_112645_make_customer_nullable_in_broadcast_penerima_table.php
 * yang mengubahnya jadi nullable - biarkan migration itu yang melonggarkannya.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('broadcast_penerima')) {
            return;
        }

        Schema::create('broadcast_penerima', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('broadcast')->nullable();
            $table->integer('user')->nullable();
            $table->string('notelp', 20)->nullable();
            $table->text('pesan')->nullable();
            $table->text('response')->nullable();
            $table->char('status', 2)->nullable();
            $table->string('send_at', 20)->nullable();
            $table->integer('customer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('broadcast_penerima');
    }
};
