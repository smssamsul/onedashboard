<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\KategoriProdukController;
use App\Http\Controllers\Api\TemplateFollupController;
use App\Http\Controllers\Api\ProdukController;
use App\Http\Controllers\Api\LogsFollupController;
use App\Http\Controllers\Api\OrderCustomerController;
use App\Http\Controllers\Api\LogoutController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::post('/login', App\Http\Controllers\Api\LoginController::class)->name('login');
Route::post('/register', App\Http\Controllers\Api\RegisterController::class)->name('register');

// Route::middleware('auth:api')->get('/user', function (Request $request) {
//     return $request->user_login();
// });

Route::middleware(['throttle:order'])->group(function () {
    Route::post('/order', [OrderCustomerController::class, 'store']);
});

// Route::post('/order', [OrderCustomerController::class, 'store']);

Route::middleware('auth:api')->post('/logout', LogoutController::class)->name('logout');

Route::middleware('auth:api')->group(function () {
    // User
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{id}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);

    // Customer
    Route::get('/customer', [CustomerController::class, 'index']);
    // Route::post('/customer', [CustomerController::class, 'store']);
    Route::get('/customer/{id}', [CustomerController::class, 'show']);
    Route::put('/customer/{id}', [CustomerController::class, 'update']);
    Route::delete('/customer/{id}', [CustomerController::class, 'destroy']);
    Route::post('/customer/update/{id}', [CustomerController::class, 'form_customer_update']);

    // Kategori Produk
    Route::get('/kategori-produk', [KategoriProdukController::class, 'index']);
    Route::post('/kategori-produk', [KategoriProdukController::class, 'store']);
    Route::get('/kategori-produk/{id}', [KategoriProdukController::class, 'show']);
    Route::put('/kategori-produk/{id}', [KategoriProdukController::class, 'update']);
    Route::delete('/kategori-produk/{id}', [KategoriProdukController::class, 'destroy']);

    // Template Follup
    Route::get('/template-follup', [TemplateFollupController::class, 'index']);
    Route::post('/template-follup', [TemplateFollupController::class, 'store']);
    Route::get('/template-follup/{id}', [TemplateFollupController::class, 'show']);
    Route::put('/template-follup/{id}', [TemplateFollupController::class, 'update']);
    Route::delete('/template-follup/{id}', [TemplateFollupController::class, 'destroy']);

    // Produk
    Route::get('/produk', [ProdukController::class, 'index']);
    Route::post('/produk', [ProdukController::class, 'store']);
    Route::get('/produk/{id}', [ProdukController::class, 'show']);
    Route::post('/produk/{id}', [ProdukController::class, 'update']); 
    Route::delete('/produk/{id}', [ProdukController::class, 'destroy']);

    Route::delete('/produk/{id}/gambar/{index}', [ProdukController::class, 'deleteImage']);

    // Log Follup
    Route::get('/logs-follup', [LogsFollupController::class, 'index']);
    Route::post('/logs-follup', [LogsFollupController::class, 'show']);

    // Order Customer
    Route::get('/order', [OrderCustomerController::class, 'index']);
    Route::get('/order/{id}', [OrderCustomerController::class, 'show']);
    Route::put('/order/{id}', [OrderCustomerController::class, 'update']);
    Route::post('/order-konfirmasi/{id}', [OrderCustomerController::class, 'konfirmasi']);
    // Route::delete('/order/{id}', [TemplateFollupController::class, 'destroy']);
});

