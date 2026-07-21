<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Kolom "order" di logs_follup sudah ada di DB tapi tidak tercatat di migration
     * manapun (schema drift, ditambah lewat SQL manual). Migration ini hanya
     * menambah kolom invitation, tidak menyentuh kolom order yang sudah ada.
     */
    public function up(): void
    {
        Schema::table('logs_follup', function (Blueprint $table) {
            $table->unsignedBigInteger('invitation')->nullable()->after('order');
            $table->foreign('invitation')->references('id')->on('invitation')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('logs_follup', function (Blueprint $table) {
            $table->dropForeign(['invitation']);
            $table->dropColumn('invitation');
        });
    }
};
