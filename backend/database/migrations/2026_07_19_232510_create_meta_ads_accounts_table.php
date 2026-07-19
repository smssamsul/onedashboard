<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ads_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('nama');
            $table->string('ad_account_id')->nullable();
            $table->text('access_token')->nullable();
            $table->string('app_id')->nullable();
            $table->text('app_secret')->nullable();
            $table->string('business_id')->nullable();
            $table->string('currency')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_synced_at')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ads_accounts');
    }
};
