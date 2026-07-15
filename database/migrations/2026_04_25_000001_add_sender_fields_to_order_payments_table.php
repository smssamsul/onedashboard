<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            if (!Schema::hasColumn('order_payments', 'nama_pengirim')) {
                $table->string('nama_pengirim')->nullable()->after('bukti_pembayaran');
            }
            if (!Schema::hasColumn('order_payments', 'no_rek_pengirim')) {
                $table->string('no_rek_pengirim', 64)->nullable()->after('nama_pengirim');
            }
        });
    }

    public function down(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            if (Schema::hasColumn('order_payments', 'no_rek_pengirim')) {
                $table->dropColumn('no_rek_pengirim');
            }
            if (Schema::hasColumn('order_payments', 'nama_pengirim')) {
                $table->dropColumn('nama_pengirim');
            }
        });
    }
};

