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
        Schema::table('order_customer', function (Blueprint $table) {
            $table->string('qr_token', 64)->nullable()->unique()->after('status_pembayaran');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_customer', function (Blueprint $table) {
            $table->dropColumn('qr_token');
        });
    }
};
