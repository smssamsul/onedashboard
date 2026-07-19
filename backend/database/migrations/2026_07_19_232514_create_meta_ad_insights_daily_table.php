<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meta_ad_insights_daily', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meta_ads_account_id')->constrained('meta_ads_accounts')->cascadeOnDelete();
            $table->string('campaign_id')->index();
            $table->date('date');
            $table->decimal('spend', 15, 2)->default(0);
            $table->bigInteger('impressions')->default(0);
            $table->bigInteger('reach')->default(0);
            $table->bigInteger('clicks')->default(0);
            $table->bigInteger('link_clicks')->nullable();
            $table->decimal('cpc', 15, 4)->nullable();
            $table->decimal('cpm', 15, 4)->nullable();
            $table->decimal('ctr', 15, 4)->nullable();
            $table->bigInteger('conversions')->nullable();
            $table->decimal('conversion_value', 15, 2)->nullable();
            $table->json('raw_actions')->nullable();
            $table->timestamp('create_at')->nullable();
            $table->timestamp('update_at')->nullable();

            $table->unique(['meta_ads_account_id', 'campaign_id', 'date'], 'meta_insights_account_campaign_date_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meta_ad_insights_daily');
    }
};
