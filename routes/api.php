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
    MidtransController,
    WhatsAppBotController
};

use App\Http\Controllers\Api\Customer\CustomerDashboardController;
use App\Http\Controllers\Api\SalesDashboardController;
use App\Http\Controllers\Api\HRDashboardController;
use App\Http\Controllers\Api\FinanceDashboardController;
use App\Http\Controllers\Api\MarketingDashboardController;

use App\Services\ZoomService;

use App\Http\Controllers\Api\WebinarController;

Route::get('/webinar', [WebinarController::class, 'index']);
Route::post('/webinar', [WebinarController::class, 'store']);

Route::get('/test-zoom-token', function () {
    
    $token = ZoomService::getAccessToken();
    $response = Http::withToken($token)
        ->get('https://api.zoom.us/v2/users/me');

    return $response->json();
});

Route::post('/laporan/minggu-ini', [OrderCustomerController::class, 'laporanMingguIni']);

Route::get('/landing/{kode}', [ProdukController::class, 'showByKode']);

Route::post('/login', LoginController::class)->name('login');
Route::post('/register', RegisterController::class)->name('register');

// OTP Routes untuk public (sebelum login, menggunakan hash key)
Route::post('/otp/send', [OtpCustomerController::class, 'sendOtp'])
        ->middleware(['throttle:otp', 'hash.key']);
Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])
        ->middleware(['throttle:otp', 'hash.key']);

// WhatsApp Bot Webhook
Route::post('/whatsapp/webhook', [WhatsAppBotController::class, 'webhook'])
    ->middleware('throttle:60,1'); // Rate limit: 60 requests per minute

Route::middleware(['throttle:order'])->post('/order', [OrderCustomerController::class, 'store']);


Route::prefix('admin')->group(function () {
   

    Route::middleware('auth:api')->group(function () {
        Route::post('/logout', LogoutController::class)->name('logout');
        
        // Sales Dashboard
        Route::get('/sales/dashboard', [SalesDashboardController::class, 'index']);
        
        // HR Dashboard
        Route::get('/hr/dashboard', [HRDashboardController::class, 'index']);
        
        // Finance Dashboard
        Route::get('/finance/dashboard', [FinanceDashboardController::class, 'index']);
        
        // Marketing Dashboard
        Route::get('/marketing/dashboard', [MarketingDashboardController::class, 'index']);

        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        Route::get('/customer', [CustomerController::class, 'index']);
        Route::get('/customer/riwayat-order/{id}', [CustomerController::class, 'riwayat_order']);
        Route::post('/customer', [CustomerController::class, 'store']);
        Route::get('/customer/{id}', [CustomerController::class, 'show']);
        Route::put('/customer/{id}', [CustomerController::class, 'update']);
        Route::delete('/customer/{id}', [CustomerController::class, 'destroy']);
        Route::post('/customer/update/{id}', [CustomerController::class, 'form_customer_update']);

        Route::post('/template-follup', [TemplateFollupController::class, 'index']);
        Route::post('/template-follup/store', [TemplateFollupController::class, 'store']);
       
        Route::apiResource('kategori-produk', KategoriProdukController::class);
        // Route::apiResource('template-follup', TemplateFollupController::class);
        
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
        Route::post('/otp/send', [OtpCustomerController::class, 'sendOtp'])->middleware('throttle:otp');
        Route::post('/otp/verify', [OtpCustomerController::class, 'verifyOtp']);
        Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])->middleware('throttle:otp');
    
    });
});

Route::prefix('midtrans')->group(function () {
    Route::post('/create-snap', [MidtransController::class, 'createSnapTokenGeneral']);
    Route::post('/create-snap-cc', [MidtransController::class, 'createSnapTokenCC']);
    Route::post('/create-snap-va', [MidtransController::class, 'createSnapTokenVA']);
    Route::post('/create-snap-ewallet', [MidtransController::class, 'createSnapTokenEwallet']);
    Route::post('/notification', [MidtransController::class, 'notificationHandler']);
});