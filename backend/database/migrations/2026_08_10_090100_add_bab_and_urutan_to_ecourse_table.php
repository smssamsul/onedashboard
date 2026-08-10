<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddBabAndUrutanToEcourseTable extends Migration
{
    public function up()
    {
        Schema::table('ecourse', function (Blueprint $table) {
            $table->foreignId('ecourse_bab_id')->nullable()->after('id')
                ->constrained('ecourse_bab')->onDelete('cascade');
            $table->unsignedInteger('urutan')->default(0)->after('description');
        });
    }

    public function down()
    {
        Schema::table('ecourse', function (Blueprint $table) {
            $table->dropConstrainedForeignId('ecourse_bab_id');
            $table->dropColumn('urutan');
        });
    }
}
