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
        Schema::create('otp_customer', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer')->constrained('customer')->onDelete('cascade');
            $table->string('otp');
            $table->string('used')->default('0');
            $table->integer('percobaan')->default(0);
            $table->timestamp('create_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->string('status')->default('1');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('otp_customer');
    }
};

