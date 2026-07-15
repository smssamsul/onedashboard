<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('phone_number', 30)->nullable()->index();
            $table->text('first_message')->nullable();
            $table->string('source', 50)->nullable()->default('whatsapp');
            $table->unsignedBigInteger('assigned_sales_id')->nullable()->index();
            $table->timestamp('assigned_at')->nullable();
            $table->string('status', 50)->nullable()->default('new');
            $table->integer('lead_score')->default(0);
            $table->timestamp('last_reply_at')->nullable();
            $table->timestamp('followup_at')->nullable();
            $table->string('product')->nullable();
            $table->string('location')->nullable();
            // Legacy fields untuk kompatibilitas
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->unsignedBigInteger('sales_id')->nullable();
            $table->string('lead_label')->nullable();
            $table->string('minat_produk')->nullable();
            $table->text('alasan_tertarik')->nullable();
            $table->text('alasan_belum')->nullable();
            $table->text('harapan')->nullable();
            $table->timestamp('last_contact_at')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();
            $table->text('create_param')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_leads');
    }
};
