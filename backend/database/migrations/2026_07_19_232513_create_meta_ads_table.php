<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_ad_set_id')->constrained('meta_ad_sets')->cascadeOnDelete();
            $table->string('ad_id')->unique();
            $table->string('name')->nullable();
            $table->string('status')->nullable();
            $table->string('creative_id')->nullable();
            $table->json('creative_payload')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ads');
    }
};
