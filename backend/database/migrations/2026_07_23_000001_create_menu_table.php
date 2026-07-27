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
        if (Schema::hasTable('menu')) {
            return;
        }

        Schema::create('menu', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->string('label', 150);
            $table->string('href', 255)->nullable();
            $table->string('icon_name', 100)->nullable();
            $table->string('section', 100)->nullable();
            // FK manual (bukan ->constrained()) karena hr_departemen adalah tabel legacy
            // yang tidak dikelola migration Laravel — divalidasi via exists:hr_departemen,id di controller.
            $table->unsignedBigInteger('departemen_id')->nullable();
            $table->integer('urutan')->default(0);
            $table->string('status', 1)->default('1'); // '1' aktif, 'N' nonaktif (soft delete)
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();

            $table->index('departemen_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('menu');
    }
};
