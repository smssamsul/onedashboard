<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEcourseProgressTable extends Migration
{
    public function up()
    {
        Schema::create('ecourse_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('customer')->onDelete('cascade');
            $table->foreignId('ecourse_id')->constrained('ecourse')->onDelete('cascade');
            $table->boolean('is_completed')->default(false);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['customer_id', 'ecourse_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('ecourse_progress');
    }
}
