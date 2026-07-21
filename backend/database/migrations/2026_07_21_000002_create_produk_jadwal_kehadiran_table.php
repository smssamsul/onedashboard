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
        Schema::create('produk_jadwal_kehadiran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jadwal_id')->constrained('produk_jadwal')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('customer')->onDelete('cascade');
            // source_type: 'order' | 'invitation' | null (walk-in tanpa order/invitation)
            $table->string('source_type', 20)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('status_hadir', 20)->default('hadir');
            $table->timestamp('waktu_checkin')->nullable();
            $table->foreignId('checked_by')->nullable()->constrained('user')->onDelete('set null');
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->string('status')->default('1');

            $table->unique(['jadwal_id', 'customer_id'], 'uq_kehadiran_jadwal_customer');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produk_jadwal_kehadiran');
    }
};
