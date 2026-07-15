<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('percakapan', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('ai_leads_id')->nullable();
            $table->string('phone_number', 30)->index();
            $table->unsignedBigInteger('assigned_sales_id')->nullable()->index();
            $table->string('status', 20)->nullable()->index(); // hot, warm, cold, trash, dll
            $table->integer('lead_score')->default(0);
            $table->json('tags')->nullable();
            $table->string('source', 50)->nullable(); // whatsapp, web, dll
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('percakapan');
    }
};
