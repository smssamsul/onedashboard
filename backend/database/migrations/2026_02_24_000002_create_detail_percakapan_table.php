<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('detail_percakapan', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('id_percakapan')->index();
            $table->string('sender_type', 20); // customer, AI, sales, system
            $table->text('message_text');
            $table->string('message_type', 20)->default('text'); // text, image, dll
            $table->json('tags')->nullable();
            $table->timestamp('created_at')->nullable()->index(); // timestamps = false di model
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('detail_percakapan');
    }
};
