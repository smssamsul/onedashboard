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
        if (Schema::hasTable('menu_akses')) {
            return;
        }

        Schema::create('menu_akses', function (Blueprint $table) {
            $table->id();
            // FK manual ke hr_departemen (tabel legacy, tidak dikelola migration).
            $table->unsignedBigInteger('departemen_id');
            $table->foreignId('jabatan_id')->constrained('jabatan')->onDelete('cascade');
            $table->foreignId('menu_id')->constrained('menu')->onDelete('cascade');
            $table->string('create_at', 20)->nullable();

            $table->unique(['departemen_id', 'jabatan_id', 'menu_id'], 'menu_akses_unique_combo');
            $table->index(['departemen_id', 'jabatan_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu_akses');
    }
};
