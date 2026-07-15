<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

// Update default kolom score_label ke 'cold'
DB::statement("ALTER TABLE customer ALTER COLUMN score_label SET DEFAULT 'cold'");
echo "Default score_label updated to 'cold'" . PHP_EOL;

// Verifikasi distribusi
$result = DB::table('customer')->selectRaw("score_label, COUNT(*) as total")->groupBy('score_label')->get();
foreach ($result as $r) {
    echo $r->score_label . ': ' . $r->total . PHP_EOL;
}
