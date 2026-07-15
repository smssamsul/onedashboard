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
        Schema::create('lead_lpwas', function (Blueprint $table) {
            $table->id();
            $table->string('nama')->nullable();
            $table->string('no_wa')->nullable();
            $table->unsignedBigInteger('produk_id')->nullable();
            $table->unsignedBigInteger('sales_id')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_lpwas');
    }
};
