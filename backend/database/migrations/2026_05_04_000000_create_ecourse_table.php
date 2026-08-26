<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEcourseTable extends Migration
{
    /**
     * ecourse dulunya dibuat dari SQL dump, bukan migration ini - guard
     * hasTable() supaya aman dijalankan di database yang tabelnya sudah ada.
     */
    public function up()
    {
        if (Schema::hasTable('ecourse')) {
            return;
        }

        Schema::create('ecourse', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('video_path'); // S3 path
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Sengaja no-op: up() cuma membuat tabel kalau belum ada, jadi down() tidak
     * boleh drop tabel begitu saja - berisiko menghapus data produksi asli.
     */
    public function down()
    {
        //
    }
}
