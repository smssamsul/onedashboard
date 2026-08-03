<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales PIC disimpan per order, bukan hanya di customer, supaya satu customer
     * bisa dipegang sales berbeda tergantung produk yang dia beli.
     */
    public function up(): void
    {
        if (!Schema::hasColumn('order_customer', 'sales_id')) {
            Schema::table('order_customer', function (Blueprint $table) {
                $table->unsignedBigInteger('sales_id')->nullable();
                $table->index('sales_id');
            });

            // Backfill dari sales customer supaya order lama tetap tampil sales-nya
            DB::statement("
                UPDATE order_customer
                SET sales_id = c.sales_id
                FROM customer c
                WHERE order_customer.customer = c.id
                  AND order_customer.sales_id IS NULL
                  AND c.sales_id IS NOT NULL
            ");
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('order_customer', 'sales_id')) {
            Schema::table('order_customer', function (Blueprint $table) {
                $table->dropIndex(['sales_id']);
                $table->dropColumn('sales_id');
            });
        }
    }
};
