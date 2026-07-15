<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Menyimpan resi/waybill Biteship per order_customer (bisa banyak baris per order).
     */
    public function up(): void
    {
        Schema::create('order_resi', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('order_id');
            $table->string('biteship_order_id')->nullable()->index();
            $table->string('tracking_id')->nullable()->index();
            $table->string('waybill_id')->nullable()->index();
            $table->string('courier_company', 64)->nullable();
            $table->string('courier_type', 64)->nullable();
            $table->string('delivery_type', 16)->default('now'); // now | scheduled
            $table->timestamp('scheduled_at')->nullable();
            $table->string('status', 64)->nullable()->index();
            $table->json('meta')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();

            $table->foreign('order_id')
                ->references('id')
                ->on('order_customer')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_resi');
    }
};
