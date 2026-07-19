<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ad_action_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreignId('meta_ads_account_id')->nullable()->constrained('meta_ads_accounts')->nullOnDelete();
            $table->string('campaign_id')->nullable();
            $table->string('action_type');
            $table->json('before_value')->nullable();
            $table->json('after_value')->nullable();
            $table->string('status')->default('success');
            $table->text('error_message')->nullable();
            $table->timestamp('create_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ad_action_logs');
    }
};
