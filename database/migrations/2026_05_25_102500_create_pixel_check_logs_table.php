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
        Schema::create('pixel_check_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->nullable()->constrained('order_customer')->onDelete('cascade');
            $table->foreignId('produk_id')->nullable()->constrained('produk')->onDelete('cascade');
            $table->string('pixel_id')->nullable();
            $table->string('event_name')->nullable();
            $table->string('source')->nullable();
            $table->string('status')->default('1');
            $table->json('payload')->nullable();
            $table->string('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pixel_check_logs');
    }
};
