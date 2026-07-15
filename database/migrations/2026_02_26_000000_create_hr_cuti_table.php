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
        // Jika tabel sudah ada (dibuat manual), jangan error saat migrate
        if (Schema::hasTable('hr_cuti')) {
            return;
        }

        Schema::create('hr_cuti', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('karyawan');
            $table->unsignedBigInteger('type_cuti');
            $table->date('start_date');
            $table->date('end_date');
            $table->text('alasan')->nullable();
            $table->string('status_cuti', 20)->default('pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->string('status', 1)->default('1');
            $table->string('create_at', 20)->nullable();
            $table->string('update_at', 20)->nullable();

            $table->index(['karyawan', 'status_cuti']);
            $table->index(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('hr_cuti');
    }
};

