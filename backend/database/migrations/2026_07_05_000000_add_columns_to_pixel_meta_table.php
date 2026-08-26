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
            if (!Schema::hasColumn('pixel_meta', 'nama')) {
                $table->string('nama')->nullable()->after('id');
            }
            if (!Schema::hasColumn('pixel_meta', 'conversion_api_token')) {
                $table->text('conversion_api_token')->nullable()->after('pixel');
            }
            if (!Schema::hasColumn('pixel_meta', 'kode_testing')) {
                $table->string('kode_testing')->nullable()->after('conversion_api_token');
            }
        });
    }

    /**
     * Sengaja no-op: kolomnya kemungkinan sudah ada sebelum migration ini
     * dijalankan (bukan dibuat olehnya), jadi down() tidak boleh drop kolom
     * begitu saja - berisiko menghapus data produksi asli.
     */
    public function down()
    {
        //
    }
}
