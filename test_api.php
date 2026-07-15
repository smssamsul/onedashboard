<?php
require 'vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$p = \App\Models\Produk::where('fb_pixel', '!=', '[]')->whereNotNull('fb_pixel')->first();
if (!$p) {
    echo "No product found";
    exit;
}

$controller = app()->make(\App\Http\Controllers\Api\Sales\ProdukController::class);
$response = $controller->showByKode($p->kode);
$data = $response->getData(true);

echo json_encode([
    'kode' => $p->kode,
    'fb_pixel' => $data['data']['fb_pixel'] ?? null,
    'pixel_list' => $data['data']['pixel_list'] ?? null
], JSON_PRETTY_PRINT);
