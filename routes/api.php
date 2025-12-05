<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use App\Services\ZoomService;

// Public Routes (No Authentication)
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\WhatsAppBotController;

// Sales Controllers
use App\Http\Controllers\Api\Sales\{
    SalesDashboardController,
    CustomerController,
    KategoriProdukController,
    TemplateFollupController,
    ProdukController,
    LogsFollupController,
    OrderCustomerController,
    OtpCustomerController,
    MidtransController,
    WebinarController
};

// Admin Controllers
use App\Http\Controllers\Api\Admin\UserController;

// Customer Controllers
use App\Http\Controllers\Api\Customer\{
    CustomerDashboardController,
    LoginCustomerController
};

// Dashboard Controllers
use App\Http\Controllers\Api\Finance\FinanceDashboardController;
use App\Http\Controllers\Api\Finance\OrderValidationController;
use App\Http\Controllers\Api\Hr\HRDashboardController;
use App\Http\Controllers\Api\Marketing\MarketingDashboardController;

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

// Authentication
Route::post('/login', LoginController::class)->name('login');

// OTP Routes untuk public (sebelum login, menggunakan hash key)
Route::post('/otp/send', [OtpCustomerController::class, 'sendOtp'])
    ->middleware(['throttle:otp', 'hash.key']);
Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])
    ->middleware(['throttle:otp', 'hash.key']);
Route::post('/otp/update-wa', [OtpCustomerController::class, 'updatePhoneAndSendOtp'])
    ->middleware(['throttle:otp', 'hash.key']);
Route::post('/otp/verify', [OtpCustomerController::class, 'verifyOtp'])
    ->middleware(['throttle:otp', 'hash.key']);

// Order (Public)
Route::middleware(['throttle:order'])->post('/order', [OrderCustomerController::class, 'store']);

// Landing Page
Route::get('/landing/{kode}', [ProdukController::class, 'showByKode']);

// Webinar (Public)
Route::get('/webinar/join-order/{orderId}', [WebinarController::class, 'joinFromOrder']);

// testing n8n otomatisasi
Route::post('/laporan/minggu-ini', [OrderCustomerController::class, 'laporanMingguIni']);

// Midtrans (Public - untuk webhook)
Route::prefix('midtrans')->group(function () {
    Route::post('/create-snap', [MidtransController::class, 'createSnapTokenGeneral']);
    Route::post('/create-snap-cc', [MidtransController::class, 'createSnapTokenCC']);
    Route::post('/create-snap-va', [MidtransController::class, 'createSnapTokenVA']);
    Route::post('/create-snap-ewallet', [MidtransController::class, 'createSnapTokenEwallet']);
    Route::post('/notification', [MidtransController::class, 'notificationHandler']);
});

// WhatsApp Bot Webhook
Route::post('/whatsapp/webhook', [WhatsAppBotController::class, 'webhook'])
    ->middleware('throttle:60,1');

// Test Zoom Token
Route::get('/test-zoom-token', function () {
    $token = ZoomService::getAccessToken();
    $response = Http::withToken($token)
        ->get('https://api.zoom.us/v2/users/me');
    return $response->json();
});


Route::middleware('auth:api')->group(function () {

    Route::post('/logout', LogoutController::class)->name('logout');

    Route::prefix('sales')->group(function () {

        // Dashboard
        Route::get('/dashboard', [SalesDashboardController::class, 'index']);

        // Customer
        Route::get('/customer', [CustomerController::class, 'index']);
        Route::get('/customer/{id}', [CustomerController::class, 'show']);
        Route::post('/customer', [CustomerController::class, 'store']);
        Route::put('/customer/{id}', [CustomerController::class, 'update']);
        Route::delete('/customer/{id}', [CustomerController::class, 'destroy']);
        Route::get('/customer/riwayat-order/{id}', [CustomerController::class, 'riwayat_order']);
        Route::get('/customer/followup/{id}', [CustomerController::class, 'followup']);
        Route::post('/customer/update/{id}', [CustomerController::class, 'form_customer_update']);

        // Produk
        Route::get('/produk', [ProdukController::class, 'index']);
        Route::get('/produk/{id}', [ProdukController::class, 'show']);
        Route::post('/produk', [ProdukController::class, 'store']);
        Route::put('/produk/{id}', [ProdukController::class, 'update']);
        Route::delete('/produk/{id}', [ProdukController::class, 'destroy']);
        Route::put('/produk/{id}/trainer', [ProdukController::class, 'updateTrainer']);
        Route::delete('/produk/{id}/gambar/{index}', [ProdukController::class, 'deleteImage']);
        Route::delete('/produk/{id}/testimoni/{index}', [ProdukController::class, 'deleteTestimoni']);

        // Kategori Produk
        Route::get('/kategori-produk', [KategoriProdukController::class, 'index']);
        Route::get('/kategori-produk/{id}', [KategoriProdukController::class, 'show']);
        Route::post('/kategori-produk', [KategoriProdukController::class, 'store']);
        Route::put('/kategori-produk/{id}', [KategoriProdukController::class, 'update']);
        Route::delete('/kategori-produk/{id}', [KategoriProdukController::class, 'destroy']);

        // Template Followup
        Route::post('/template-follup', [TemplateFollupController::class, 'index']);
        Route::post('/template-follup/store', [TemplateFollupController::class, 'store']);

        // Logs Followup
        Route::get('/logs-follup', [LogsFollupController::class, 'index']);
        Route::post('/logs-follup', [LogsFollupController::class, 'show']);

        // Order
        Route::get('/order', [OrderCustomerController::class, 'index']);
        Route::get('/order/{id}', [OrderCustomerController::class, 'show']);
        Route::put('/order/{id}', [OrderCustomerController::class, 'update']);
        Route::post('/order-konfirmasi/{id}', [OrderCustomerController::class, 'konfirmasi']);
        Route::post('/order-admin', [OrderCustomerController::class, 'store_admin']);

        // Webinar
        Route::get('/webinar/{produkId}', [WebinarController::class, 'index']);
        Route::post('/webinar', [WebinarController::class, 'store']);
        Route::put('/webinar/{id}', [WebinarController::class, 'update']);
    });

    Route::prefix('admin')->group(function () {
        // Users
        Route::get('/users', [UserController::class, 'index']);
        Route::get('/users/{id}', [UserController::class, 'show']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{id}', [UserController::class, 'update']);
        Route::delete('/users/{id}', [UserController::class, 'destroy']);

        // RabbitMQ Dashboard API
        Route::prefix('rabbitmq')->group(function () {
            Route::get('/stats', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getStats']);
            Route::get('/queue-detail', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getQueueDetail']);
            Route::post('/purge-queue', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'purgeQueue']);
            Route::get('/failed-jobs', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getFailedJobs']);
        });
    });

    Route::prefix('finance')->group(function () {
        Route::get('/dashboard', [FinanceDashboardController::class, 'index']);
        
        // Order Validation
        Route::get('/order-validation', [OrderValidationController::class, 'index']);
        Route::get('/order-validation/statistics', [OrderValidationController::class, 'statistics']);
        Route::get('/order-validation/{id}', [OrderValidationController::class, 'show']);
        Route::post('/order-validation/{id}/approve', [OrderValidationController::class, 'approve']);
        Route::post('/order-validation/{id}/reject', [OrderValidationController::class, 'reject']);
    });


    Route::prefix('hr')->group(function () {
        Route::get('/dashboard', [HRDashboardController::class, 'index']);
    });

    Route::prefix('marketing')->group(function () {
        Route::get('/dashboard', [MarketingDashboardController::class, 'index']);
    });
});


Route::prefix('customer')->group(function () {
    // Public Customer Routes
    Route::post('/otp/verify', [OtpCustomerController::class, 'verifyOtp']);
    Route::post('/login', LoginCustomerController::class);

    // Authenticated Customer Routes
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
        Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])->middleware('throttle:otp');
        Route::post('/otp/update-wa', [OtpCustomerController::class, 'updatePhoneAndSendOtp'])->middleware('throttle:otp');
    });
});

// ============================================

Route::prefix('admin/rabbitmq')->group(function () {
    Route::get('/stats', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getStats']);
    Route::get('/queue-detail', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getQueueDetail']);
    Route::post('/purge-queue', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'purgeQueue']);
    Route::get('/failed-jobs', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getFailedJobs']);
    Route::post('/queue-messages', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'getQueueMessages']);
});
