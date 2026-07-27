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
        if (Schema::hasTable('jabatan')) {
            return;
        }

        Schema::create('jabatan', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 100);
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jabatan');
    }
};
