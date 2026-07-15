<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

Schema::table('produk', function (Blueprint $table) {
    if (!Schema::hasColumn('produk', 'kota')) {
        $table->string('kota')->nullable();
    }
    if (!Schema::hasColumn('produk', 'tempat')) {
        $table->string('tempat')->nullable();
    }
    if (!Schema::hasColumn('produk', 'alamat')) {
        $table->text('alamat')->nullable();
    }
});

echo "Columns added successfully.\n";
