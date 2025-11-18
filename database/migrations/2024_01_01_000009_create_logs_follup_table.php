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
        Schema::create('logs_follup', function (Blueprint $table) {
            $table->id();
            $table->foreignId('follup')->constrained('template_follup')->onDelete('cascade');
            $table->foreignId('customer')->constrained('customer')->onDelete('cascade');
            $table->text('keterangan')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('logs_follup');
    }
};

