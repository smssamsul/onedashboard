<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddColumnsToPixelMetaTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('pixel_meta', function (Blueprint $table) {
            $table->string('nama')->nullable()->after('id');
            $table->text('conversion_api_token')->nullable()->after('pixel');
            $table->string('kode_testing')->nullable()->after('conversion_api_token');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('pixel_meta', function (Blueprint $table) {
            $table->dropColumn(['nama', 'conversion_api_token', 'kode_testing']);
        });
    }
}
