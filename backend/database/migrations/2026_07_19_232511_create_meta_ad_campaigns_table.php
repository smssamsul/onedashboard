<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ad_campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_ads_account_id')->constrained('meta_ads_accounts')->cascadeOnDelete();
            $table->string('campaign_id')->unique();
            $table->string('name')->nullable();
            $table->string('status')->nullable();
            $table->string('objective')->nullable();
            $table->decimal('daily_budget', 15, 2)->nullable();
            $table->decimal('lifetime_budget', 15, 2)->nullable();
            $table->string('buying_type')->nullable();
            $table->timestamp('start_time')->nullable();
            $table->timestamp('stop_time')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ad_campaigns');
    }
};
