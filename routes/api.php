<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\{
    LoginController,
    RegisterController,
    LogoutController,
    UserController,
    CustomerController,
    KategoriProdukController,
    TemplateFollupController,
    ProdukController,
    LogsFollupController,
    OrderCustomerController,
    OtpCustomerController,
    LoginCustomerController,
    MidtransController
};

use App\Http\Controllers\Api\Customer\CustomerDashboardController;

Route::post('/laporan/minggu-ini', [OrderCustomerController::class, 'laporanMingguIni']);

Route::get('/landing/{kode}', [ProdukController::class, 'showByKode']);

Route::post('/login', LoginController::class)->name('login');
Route::post('/register', RegisterController::class)->name('register');

Route::post('/otp/send', [OtpCustomerController::class, 'sendOtp'])
        ->middleware(['throttle:otp', 'hash.key']);
Route::post('/otp/verify', [OtpCustomerController::class, 'verifyOtp']);
Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])
        ->middleware(['throttle:otp', 'hash.key']);

Route::middleware(['throttle:order'])->post('/order', [OrderCustomerController::class, 'store']);


Route::prefix('admin')->group(function () {
   

    Route::middleware('auth:api')->group(function () {
        Route::post('/logout', LogoutController::class)->name('logout');

        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        Route::get('/customer', [CustomerController::class, 'index']);
        Route::post('/customer', [CustomerController::class, 'store']);
        Route::get('/customer/{id}', [CustomerController::class, 'show']);
        Route::put('/customer/{id}', [CustomerController::class, 'update']);
        Route::delete('/customer/{id}', [CustomerController::class, 'destroy']);
        Route::post('/customer/update/{id}', [CustomerController::class, 'form_customer_update']);

        Route::apiResource('kategori-produk', KategoriProdukController::class);
        Route::apiResource('template-follup', TemplateFollupController::class);
        Route::apiResource('produk', ProdukController::class);

        Route::delete('/produk/{id}/gambar/{index}', [ProdukController::class, 'deleteImage']);
        Route::delete('/produk/{id}/testimoni/{index}', [ProdukController::class, 'deleteTestimoni']);

        Route::get('/logs-follup', [LogsFollupController::class, 'index']);
        Route::post('/logs-follup', [LogsFollupController::class, 'show']);

        Route::get('/order', [OrderCustomerController::class, 'index']);
        Route::get('/order/{id}', [OrderCustomerController::class, 'show']);
        Route::put('/order/{id}', [OrderCustomerController::class, 'update']);
        Route::post('/order-konfirmasi/{id}', [OrderCustomerController::class, 'konfirmasi']);
        Route::post('/order-admin', [OrderCustomerController::class, 'store_admin']);
    });
});

Route::prefix('customer')->group(function () {

    Route::post('/login', LoginCustomerController::class);
    Route::middleware('auth:customer')->group(function () {
        Route::get('/dashboard', [CustomerDashboardController::class, 'index']);
        Route::post('/customer', [CustomerDashboardController::class, 'store']);
        Route::get('/debug', function (Request $request) {
            return response()->json([
                'guard' => 'customer',
                'user' => auth('customer')->user(),
            ]);
        });
    });
});

Route::prefix('midtrans')->group(function () {
    Route::post('/create-snap', [MidtransController::class, 'createSnapToken']);
    Route::post('/notification', [MidtransController::class, 'notificationHandler']);
});