<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_usage_logs', function (Blueprint $table) {
            $table->id();
            // Nama fitur pemanggil, bukan foreign key - biar tidak perlu migration
            // baru tiap kali ada fitur AI baru. Lihat AiUsageLogger::catat().
            $table->string('fitur');
            $table->string('model');
            $table->unsignedInteger('input_tokens')->default(0);
            $table->unsignedInteger('output_tokens')->default(0);
            $table->unsignedInteger('cache_creation_tokens')->default(0);
            $table->unsignedInteger('cache_read_tokens')->default(0);
            $table->decimal('estimasi_biaya_usd', 10, 6)->default(0);
            $table->boolean('sukses')->default(true);
            $table->timestamp('created_at')->useCurrent();

            $table->index('fitur');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_usage_logs');
    }
};
