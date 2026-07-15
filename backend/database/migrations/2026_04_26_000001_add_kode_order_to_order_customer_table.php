<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_customer', function (Blueprint $table) {
            if (!Schema::hasColumn('order_customer', 'kode_order')) {
                $table->string('kode_order', 32)->nullable()->after('produk');
            }
        });

        Schema::table('order_customer', function (Blueprint $table) {
            // Unique supaya tidak double jika ada race
            $table->unique('kode_order', 'order_customer_kode_order_unique');
        });
    }

    public function down(): void
    {
        Schema::table('order_customer', function (Blueprint $table) {
            $table->dropUnique('order_customer_kode_order_unique');
        });

        Schema::table('order_customer', function (Blueprint $table) {
            if (Schema::hasColumn('order_customer', 'kode_order')) {
                $table->dropColumn('kode_order');
            }
        });
    }
};

