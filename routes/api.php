<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Http;
use App\Services\ZoomService;

// Public Routes (No Authentication)
use App\Http\Controllers\Api\LoginController;
use App\Http\Controllers\Api\LogoutController;
use App\Http\Controllers\Api\WhatsAppBotController;
use App\Http\Controllers\Api\WoowaWebhookController;

// Sales Controllers
use App\Http\Controllers\Api\Sales\{
    SalesDashboardController,
    CustomerController,
    KategoriProdukController,
    TemplateFollupController,
    ProdukController,
    LogsFollupController,
    OrderCustomerController,
    OrderPaymentController,
    OtpCustomerController,
    MidtransController,
    WebinarController,
    BroadcastController,
    LeadController,
    SalesController
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
use App\Http\Controllers\Api\Hr\HrDepartemenController;
use App\Http\Controllers\Api\Hr\HrKaryawanController;
use App\Http\Controllers\Api\Hr\HrAbsensiController;
use App\Http\Controllers\Api\Hr\HrSettingController;
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

// Woowa Webhook (Public - untuk menerima data dari Woowa)
Route::post('/woowa/webhook', [WoowaWebhookController::class, 'handle'])
    ->middleware('throttle:120,1');

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
        Route::post('/customer/import-excel', [CustomerController::class, 'importFromExcel']);
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

        // Sales
        Route::get('/sales-list', [\App\Http\Controllers\Api\Sales\SalesController::class, 'index']);
        Route::get('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'show']);
        Route::post('/sales-list', [\App\Http\Controllers\Api\Sales\SalesController::class, 'store']);
        Route::put('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'update']);
        Route::delete('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'destroy']);
        
        // Head Sales - Statistics & Performance
        Route::get('/statistics', [\App\Http\Controllers\Api\Sales\SalesController::class, 'statistics']);
        Route::get('/sales-performance/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'performance']);

        // Template Followup
        Route::post('/template-follup', [TemplateFollupController::class, 'index']);
        Route::post('/template-follup/store', [TemplateFollupController::class, 'store']);

        // Logs Followup
        Route::get('/logs-follup', [LogsFollupController::class, 'index']);
        Route::post('/logs-follup', [LogsFollupController::class, 'show']);

        // Order
        Route::get('/order', [OrderCustomerController::class, 'index']);
        Route::get('/order/statistic', [OrderCustomerController::class, 'statistiOrder']);
        Route::get('/order/statistic-per-sales', [OrderCustomerController::class, 'statistiOrderPerSales']);
        Route::get('/order/sales', [OrderCustomerController::class, 'ordersForSales']);
        Route::post('/order/broadcast', [OrderCustomerController::class, 'broadcastOrders']);
        Route::post('/order/{id}/send-whatsapp', [OrderCustomerController::class, 'sendWhatsApp'])->where('id', '[0-9]+');
        Route::post('/order/{id}/reject', [OrderCustomerController::class, 'reject'])->where('id', '[0-9]+');
        Route::get('/order/{id}', [OrderCustomerController::class, 'show'])->where('id', '[0-9]+');
        Route::get('/order/{id}/logs-follup', [OrderCustomerController::class, 'showLogsFollup'])->where('id', '[0-9]+');
        Route::put('/order/{id}', [OrderCustomerController::class, 'update'])->where('id', '[0-9]+');
        Route::post('/order-konfirmasi/{id}', [OrderCustomerController::class, 'konfirmasi']);
        Route::post('/order-admin', [OrderCustomerController::class, 'store_admin']);

        // Order Payment
        Route::get('/order-payment', [OrderPaymentController::class, 'index']);
        Route::get('/order-payment/statistics', [OrderPaymentController::class, 'statistics']);
        Route::get('/order-payment/by-order/{orderId}', [OrderPaymentController::class, 'getByOrder']);
        Route::get('/order-payment/{id}', [OrderPaymentController::class, 'show']);
        Route::post('/order-payment', [OrderPaymentController::class, 'store']);
        Route::put('/order-payment/{id}', [OrderPaymentController::class, 'update']);
        Route::delete('/order-payment/{id}', [OrderPaymentController::class, 'destroy']);

        // Webinar
        Route::get('/webinar/{produkId}', [WebinarController::class, 'index']);
        Route::post('/webinar', [WebinarController::class, 'store']);
        Route::put('/webinar/{id}', [WebinarController::class, 'update']);

        // Broadcast
        Route::get('/broadcast', [BroadcastController::class, 'index']);
        Route::get('/broadcast/my-broadcast', [BroadcastController::class, 'indexByUser']);
        Route::get('/broadcast/{id}', [BroadcastController::class, 'show']);
        Route::get('/broadcast/{id}/penerima', [BroadcastController::class, 'penerima']);
        Route::post('/broadcast', [BroadcastController::class, 'store']);
        Route::post('/broadcast/per-sales', [BroadcastController::class, 'storeForMySales']);
        Route::put('/broadcast/{id}', [BroadcastController::class, 'update']);
        Route::delete('/broadcast/{id}', [BroadcastController::class, 'destroy']);
        Route::post('/broadcast/{id}/send-sales', [BroadcastController::class, 'sendToMySales']);
        Route::post('/broadcast/{id}/send', [BroadcastController::class, 'send']);

        // Leads
        Route::get('/lead', [LeadController::class, 'index']);
        Route::get('/lead/statistics', [LeadController::class, 'statistics']);
        Route::get('/lead/follow-today', [LeadController::class, 'followToday']);
        Route::get('/lead/sales-list', [LeadController::class, 'getSalesList']);
        Route::get('/lead/labels-list', [LeadController::class, 'getLeadLabels']);
        Route::get('/lead/status-orders-list', [LeadController::class, 'getCustomerStatusOrders']);
        Route::get('/lead/{id}', [LeadController::class, 'show']);
        Route::post('/lead', [LeadController::class, 'store']);
        Route::post('/lead/generate', [LeadController::class, 'generateFromCustomer']);
        Route::put('/lead/{id}', [LeadController::class, 'update']);
        Route::delete('/lead/{id}', [LeadController::class, 'destroy']);
        Route::post('/lead/{id}/send-whatsapp', [LeadController::class, 'sendWhatsApp']);
        Route::post('/lead/broadcast', [LeadController::class, 'broadcast']);

        // Follow Up Leads
        Route::get('/lead/{leadId}/followup', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'index']);
        Route::get('/followup', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'list']);
        Route::get('/followup/statistics', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'statistics']);
        Route::post('/followup', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'store']);
        Route::get('/followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'show']);
        Route::put('/followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'update']);
        Route::delete('/followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpLeadController::class, 'destroy']);


        // Follow Up Orders
        Route::get('/order/{orderId}/followup', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'index'])->where('orderId', '[0-9]+');
        Route::get('/order-followup', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'list']);
        Route::get('/order-followup/statistics', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'statistics']);
        Route::post('/order-followup', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'store']);
        Route::get('/order-followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'show']);
        Route::put('/order-followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'update']);
        Route::delete('/order-followup/{id}', [\App\Http\Controllers\Api\Sales\FollowUpOrderController::class, 'destroy']);

        // Aktivitas Leads
        Route::get('/aktivitas/lead/{leadId}', [\App\Http\Controllers\Api\Sales\AktivitasLeadController::class, 'index']);
        Route::get('/aktivitas/{id}', [\App\Http\Controllers\Api\Sales\AktivitasLeadController::class, 'show']);
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
        
        // Departemen
        Route::get('/departemen', [HrDepartemenController::class, 'index']);
        Route::get('/departemen/{id}', [HrDepartemenController::class, 'show']);
        Route::post('/departemen', [HrDepartemenController::class, 'store']);
        Route::put('/departemen/{id}', [HrDepartemenController::class, 'update']);
        Route::delete('/departemen/{id}', [HrDepartemenController::class, 'destroy']);
        
        // Shift
        Route::get('/shift', [\App\Http\Controllers\Api\Hr\HrShiftController::class, 'index']);
        Route::get('/shift/{id}', [\App\Http\Controllers\Api\Hr\HrShiftController::class, 'show']);
        Route::post('/shift', [\App\Http\Controllers\Api\Hr\HrShiftController::class, 'store']);
        Route::put('/shift/{id}', [\App\Http\Controllers\Api\Hr\HrShiftController::class, 'update']);
        Route::delete('/shift/{id}', [\App\Http\Controllers\Api\Hr\HrShiftController::class, 'destroy']);
        
        // Karyawan
        Route::get('/karyawan', [HrKaryawanController::class, 'index']);
        Route::get('/karyawan/by-current-user', [HrKaryawanController::class, 'getByCurrentUser']);
        Route::get('/karyawan/{id}', [HrKaryawanController::class, 'show']);
        Route::post('/karyawan', [HrKaryawanController::class, 'store']);
        Route::put('/karyawan/{id}', [HrKaryawanController::class, 'update']);
        Route::delete('/karyawan/{id}', [HrKaryawanController::class, 'destroy']);
        
        // Absensi
        Route::get('/absensi', [HrAbsensiController::class, 'index']);
        // Route spesifik harus didefinisikan sebelum route parameter
        Route::get('/absensi/by-current-user', [HrAbsensiController::class, 'getByCurrentUser']);
        Route::get('/absensi/export', [HrAbsensiController::class, 'export']);
        Route::get('/absensi/{id}', [HrAbsensiController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/absensi', [HrAbsensiController::class, 'store']);
        Route::post('/absensi/check-in', [HrAbsensiController::class, 'checkIn']);
        Route::post('/absensi/{id}/check-out', [HrAbsensiController::class, 'checkOut'])->where('id', '[0-9]+');
        Route::put('/absensi/{id}', [HrAbsensiController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/absensi/{id}', [HrAbsensiController::class, 'destroy'])->where('id', '[0-9]+');
        
        // Setting
        Route::get('/setting', [HrSettingController::class, 'index']);
        Route::post('/setting', [HrSettingController::class, 'store']);
        Route::put('/setting/{id}', [HrSettingController::class, 'update']);
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
        Route::get('/customer/detail', [CustomerDashboardController::class, 'show']);
        Route::get('/debug', function (Request $request) {
            return response()->json([
                'guard' => 'customer',
                'user' => auth('customer')->user(),
            ]);
        });
        Route::post('/otp/send', [OtpCustomerController::class, 'sendOtp'])->middleware('throttle:otp');
        Route::post('/otp/resend', [OtpCustomerController::class, 'resendOtp'])->middleware('throttle:otp');
        Route::post('/otp/update-wa', [OtpCustomerController::class, 'updatePhoneAndSendOtp'])->middleware('throttle:otp');
        
        // Order Customer Routes
        Route::post('/order/{id}/upload-bukti-pembayaran', [OrderCustomerController::class, 'customerUploadBuktiPembayaran'])->where('id', '[0-9]+');
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

// User API Routes (for regular users)
Route::middleware('auth:api')->prefix('user')->group(function () {
    Route::get('/profile', [\App\Http\Controllers\Api\User\UserController::class, 'getProfile']);
    Route::post('/change-password', [\App\Http\Controllers\Api\User\UserController::class, 'changePassword']);
    Route::get('/tasks', [\App\Http\Controllers\Api\User\UserTaskController::class, 'index']);
    Route::get('/tasks/{id}', [\App\Http\Controllers\Api\User\UserTaskController::class, 'show']);
    Route::post('/tasks', [\App\Http\Controllers\Api\User\UserTaskController::class, 'store']);
    Route::put('/tasks/{id}', [\App\Http\Controllers\Api\User\UserTaskController::class, 'update']);
    Route::delete('/tasks/{id}', [\App\Http\Controllers\Api\User\UserTaskController::class, 'destroy']);
    Route::get('/attendance-stats', [\App\Http\Controllers\Api\User\UserController::class, 'getAttendanceStats']);
});
