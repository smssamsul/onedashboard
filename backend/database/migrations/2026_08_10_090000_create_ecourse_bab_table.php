<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEcourseBabTable extends Migration
{
    /**
     * Pengelompokan lesson (tabel ecourse) jadi modul/bab per produk kursus.
     * Satu produk (kategori Ecourse) punya banyak bab, satu bab punya banyak lesson.
     */
    public function up()
    {
        Schema::create('ecourse_bab', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produk_id')->constrained('produk')->onDelete('cascade');
            $table->string('judul');
            $table->text('overview')->nullable();
            $table->unsignedInteger('urutan')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('ecourse_bab');
    }
}
