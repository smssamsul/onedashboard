<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$produk = App\Models\Produk::with(['jadwal_rel' => function ($query) {
    $query->where('waktu_mulai', '>=', now())
          ->where('status', '!=', 'N')
          ->orderBy('waktu_mulai', 'asc');
}])
->where('kategori', 3) // Seminar
->where('status', '!=', 'N')
->whereHas('jadwal_rel', function ($query) {
    $query->where('waktu_mulai', '>=', now())
          ->where('status', '!=', 'N');
})
->get();

echo "Count: " . count($produk) . "\n";
foreach($produk as $p) {
    echo $p->nama . "\n";
    foreach($p->jadwal_rel as $j) {
        echo " - " . $j->waktu_mulai . "\n";
    }
}
