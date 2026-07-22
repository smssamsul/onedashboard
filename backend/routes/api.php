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
    OrderUtmController,
    OrderPaymentController,
    OtpCustomerController,
    DokuController,
    WebinarController,
    ZoomRecordController,
    OrderResiController,
    BroadcastController,
    LeadController,
    SalesController,
    TemplateBroadcastController,
    BaileysController,
    InvitationController,
    ProdukJadwalKehadiranController
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
use App\Http\Controllers\Api\Hr\HrCutiController;
use App\Http\Controllers\Api\Hr\HrIzinController;
use App\Http\Controllers\Api\Hr\HrTypeCutiController;
use App\Http\Controllers\Api\Hr\HrSettingController;
use App\Http\Controllers\Api\Hr\HrTodoListController;
use App\Http\Controllers\Api\Marketing\MarketingDashboardController;
use App\Http\Controllers\Api\Sales\PixelMetaController;
use App\Http\Controllers\Api\PostController;


use App\Http\Controllers\Api\KnowledgeSourceController;
use App\Http\Controllers\Api\TodoListController;
use App\Http\Controllers\Api\BiteshipWebhookController;

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
Route::get('/public-order/{id}', [OrderCustomerController::class, 'publicShowOrder']);
Route::post('/public-order/{id}/upload-bukti-pembayaran', [OrderCustomerController::class, 'publicUploadBuktiPembayaran']);
Route::post('/pixel-log', [\App\Http\Controllers\Api\Sales\PixelLogController::class, 'store']);

// Landing Page
Route::get('/landing/{kode}', [ProdukController::class, 'showByKode']);
Route::get('/seminar/schedules', [ProdukController::class, 'publicSeminarSchedules']);

// Invitation (Public — form via link referral)
Route::middleware(['throttle:invitation'])->post('/invitation', [InvitationController::class, 'publicStore']);
Route::get('/public-invitation/{id}', [InvitationController::class, 'publicShow']);

// Attendance / Kehadiran Produk (Public — self check-in via QR scan)
Route::get('/public-jadwal/{jadwalId}', [ProdukJadwalKehadiranController::class, 'publicJadwalInfo']);
Route::get('/public-jadwal/{jadwalId}/kehadiran', [ProdukJadwalKehadiranController::class, 'publicKehadiranList']);
Route::middleware(['throttle:kehadiran'])->group(function () {
    Route::post('/kehadiran/lookup', [ProdukJadwalKehadiranController::class, 'publicLookup']);
    Route::post('/kehadiran/checkin', [ProdukJadwalKehadiranController::class, 'publicCheckin']);
});

// Webinar (Public)
Route::get('/webinar/join-order/{orderId}', [WebinarController::class, 'joinFromOrder']);

// Biteship webhook (publik — set header X-One-Webhook-Token = BITESHIP_WEBHOOK_SECRET)
Route::post('/biteship/webhook', [BiteshipWebhookController::class, 'handle'])
    ->middleware('throttle:120,1');

// testing n8n otomatisasi
Route::post('/laporan/minggu-ini', [OrderCustomerController::class, 'laporanMingguIni']);

// DOKU (Public - untuk webhook)
Route::prefix('doku')->group(function () {
    Route::post('/create-payment', [DokuController::class, 'createPaymentGeneral']);
    Route::post('/create-payment-cc', [DokuController::class, 'createPaymentCC']);
    Route::post('/create-payment-va', [DokuController::class, 'createPaymentVA']);
    Route::post('/create-payment-ewallet', [DokuController::class, 'createPaymentEwallet']);
    Route::post('/notification', [DokuController::class, 'notificationHandler']);
});

// WhatsApp Bot Webhook
Route::post('/whatsapp/webhook', [WhatsAppBotController::class, 'webhook'])
    ->middleware('throttle:60,1');

// WhatsApp AI Webhook (untuk AI flow dengan pgvector)
use App\Http\Controllers\Api\WhatsAppWebhookController;
Route::post('/webhook/whatsapp', [WhatsAppWebhookController::class, 'handle'])
    ->middleware('throttle:60,1');

// Woowa Webhook (Public - untuk menerima data dari Woowa)
Route::post('/woowa/webhook', [WoowaWebhookController::class, 'handle'])
    ->middleware('throttle:120,1');

// LPWA Baileys Webhook
Route::post('/baileys/webhook-lpwa', [\App\Http\Controllers\Api\Sales\LpwaWebhookController::class, 'handleWebhook'])
    ->middleware('throttle:120,1');

// Post by Slug (Public)
Route::get('/post/slug/{slug}', [PostController::class, 'showBySlug']);

// Pixel Meta (Public for Landing Page)
Route::get('/sales/pixel-meta/public', [\App\Http\Controllers\Api\Sales\PixelMetaController::class, 'getPublicPixels']);

// Test Zoom Token
Route::get('/test-zoom-token', function () {
    $token = ZoomService::getAccessToken();
    $response = Http::withToken($token)
        ->get('https://api.zoom.us/v2/users/me');
    return $response->json();
});


Route::middleware('auth:api')->group(function () {

    Route::post('/logout', LogoutController::class)->name('logout');

    // Direksi routes
    Route::prefix('direksi')->group(function () {
        Route::get('/dashboard', [\App\Http\Controllers\Api\Direksi\DireksiDashboardController::class, 'index']);
    });

    Route::prefix('sales')->group(function () {
        Route::get('/pixel-meta', [PixelMetaController::class, 'index']);
        Route::get('/pixel-meta/{id}', [PixelMetaController::class, 'show']);
        Route::post('/pixel-meta', [PixelMetaController::class, 'store']);
        Route::put('/pixel-meta/{id}', [PixelMetaController::class, 'update']);
        Route::delete('/pixel-meta/{id}', [PixelMetaController::class, 'destroy']);

        // Meta Ads - akun (config/kredensial)
        Route::get('/meta-ads/accounts', [\App\Http\Controllers\Api\Sales\MetaAdsAccountController::class, 'index']);
        Route::get('/meta-ads/accounts/{id}', [\App\Http\Controllers\Api\Sales\MetaAdsAccountController::class, 'show']);
        Route::post('/meta-ads/accounts', [\App\Http\Controllers\Api\Sales\MetaAdsAccountController::class, 'store']);
        Route::put('/meta-ads/accounts/{id}', [\App\Http\Controllers\Api\Sales\MetaAdsAccountController::class, 'update']);
        Route::delete('/meta-ads/accounts/{id}', [\App\Http\Controllers\Api\Sales\MetaAdsAccountController::class, 'destroy']);

        // Meta Ads - performa (read-only, dipakai menu Marketing & Sales)
        Route::get('/meta-ads/performance/overview', [\App\Http\Controllers\Api\Sales\MetaAdsPerformanceController::class, 'overview']);
        Route::get('/meta-ads/performance/campaigns', [\App\Http\Controllers\Api\Sales\MetaAdsPerformanceController::class, 'campaigns']);
        Route::get('/meta-ads/performance/campaigns/{campaignId}', [\App\Http\Controllers\Api\Sales\MetaAdsPerformanceController::class, 'campaignDetail']);

        // Meta Ads - kelola campaign (Marketing only, aksi nyata ke Meta)
        Route::post('/meta-ads/campaigns', [\App\Http\Controllers\Api\Sales\MetaAdsCampaignController::class, 'store']);
        Route::post('/meta-ads/campaigns/{campaignId}/pause', [\App\Http\Controllers\Api\Sales\MetaAdsCampaignController::class, 'pause']);
        Route::post('/meta-ads/campaigns/{campaignId}/resume', [\App\Http\Controllers\Api\Sales\MetaAdsCampaignController::class, 'resume']);
        Route::put('/meta-ads/campaigns/{campaignId}/budget', [\App\Http\Controllers\Api\Sales\MetaAdsCampaignController::class, 'updateBudget']);

        // Meta Ads - crosscheck Pixel/CAPI vs data Meta
        Route::get('/meta-ads/crosscheck', [\App\Http\Controllers\Api\Sales\MetaAdsCrosscheckController::class, 'crosscheck']);
        Route::get('/meta-ads/crosscheck/summary', [\App\Http\Controllers\Api\Sales\MetaAdsCrosscheckController::class, 'crosscheckSummary']);


        // Dashboard
        Route::get('/dashboard', [SalesDashboardController::class, 'index']);
        Route::get('/dashboard/produk-statistics', [SalesDashboardController::class, 'produkStatistics']);
        Route::get('/dashboard/produk-statistics-all', [SalesDashboardController::class, 'produkStatisticsAll']);

        // Customer
        Route::get('/customer', [CustomerController::class, 'index']);
        Route::get('/customer/statistics', [CustomerController::class, 'statistics']);
        Route::get('/customer/leads', [CustomerController::class, 'indexLeads']);
        Route::get('/customer/{id}', [CustomerController::class, 'show']);
        Route::post('/customer', [CustomerController::class, 'store']);
        Route::put('/customer/{id}', [CustomerController::class, 'update']);
        Route::delete('/customer/{id}', [CustomerController::class, 'destroy']);
        Route::post('/customer/import-excel', [CustomerController::class, 'importFromExcel']);
        Route::post('/customer/import-arsip', [CustomerController::class, 'importArsipFromExcel']);
        Route::post('/customer/import-workshop', [CustomerController::class, 'importWorkshopCustomer']);
        Route::get('/customer/riwayat-order/{id}', [CustomerController::class, 'riwayat_order']);
        Route::get('/customer/followup/{id}', [CustomerController::class, 'followup']);
        Route::post('/customer/update/{id}', [CustomerController::class, 'form_customer_update']);
        Route::post('/customer/{id}/promote', [CustomerController::class, 'promoteToCustomer']);
        Route::get('/customer/{id}/followups', [CustomerController::class, 'getFollowups']);
        Route::post('/customer/{id}/followups', [CustomerController::class, 'storeFollowup']);

        // Lead LPWA
        Route::get('/lead-lpwa', [\App\Http\Controllers\Api\Sales\LeadLpwaController::class, 'index']);
        Route::post('/lead-lpwa', [\App\Http\Controllers\Api\Sales\LeadLpwaController::class, 'store']);
        Route::put('/lead-lpwa/{id}', [\App\Http\Controllers\Api\Sales\LeadLpwaController::class, 'update']);
        Route::delete('/lead-lpwa/{id}', [\App\Http\Controllers\Api\Sales\LeadLpwaController::class, 'destroy']);


        // Produk
        Route::get('/produk', [ProdukController::class, 'index']);
        Route::get('/produk/{id}', [ProdukController::class, 'show']);
        Route::post('/produk', [ProdukController::class, 'store']);
        Route::put('/produk/{id}', [ProdukController::class, 'update']);
        Route::delete('/produk/{id}', [ProdukController::class, 'destroy']);
        Route::put('/produk/{id}/trainer', [ProdukController::class, 'updateTrainer']);
        Route::put('/produk/{id}/post', [ProdukController::class, 'updatePost']);
        Route::delete('/produk/{id}/gambar/{index}', [ProdukController::class, 'deleteImage']);
        Route::delete('/produk/{id}/testimoni/{index}', [ProdukController::class, 'deleteTestimoni']);

        // Knowledge Sources (AI Vector)
        Route::get('/knowledge-source', [KnowledgeSourceController::class, 'index']);
        Route::get('/knowledge-source/{id}', [KnowledgeSourceController::class, 'show']);
        Route::post('/knowledge-source', [KnowledgeSourceController::class, 'store']);
        Route::put('/knowledge-source/{id}', [KnowledgeSourceController::class, 'update']);
        Route::delete('/knowledge-source/{id}', [KnowledgeSourceController::class, 'destroy']);
        Route::get('/knowledge-source/chunk/{id}/check-embedding', [KnowledgeSourceController::class, 'checkEmbedding']);
        Route::post('/knowledge-source/{id}/regenerate-embeddings', [KnowledgeSourceController::class, 'regenerateEmbeddings']);

        // AI Setting
        Route::get('/ai-setting', [\App\Http\Controllers\Api\Sales\AiSettingController::class, 'index']);
        Route::post('/ai-setting', [\App\Http\Controllers\Api\Sales\AiSettingController::class, 'store']);
        Route::put('/ai-setting/{id}', [\App\Http\Controllers\Api\Sales\AiSettingController::class, 'update']);

        // AI Simulasi Percakapan
        Route::post('/ai-simulasi/chat', [\App\Http\Controllers\Api\Sales\AiSimulasiController::class, 'chat']);
        Route::post('/ai-simulasi/save-prompt', [\App\Http\Controllers\Api\Sales\AiSimulasiController::class, 'savePrompt']);

        // Sales Setting
        Route::get('/setting', [\App\Http\Controllers\Api\Sales\SalesSettingController::class, 'show']);
        Route::post('/setting', [\App\Http\Controllers\Api\Sales\SalesSettingController::class, 'update']);

        // Kategori Produk
        Route::get('/kategori-produk', [KategoriProdukController::class, 'index']);
        Route::get('/kategori-produk/{id}', [KategoriProdukController::class, 'show']);
        Route::post('/kategori-produk', [KategoriProdukController::class, 'store']);
        Route::put('/kategori-produk/{id}', [KategoriProdukController::class, 'update']);
        Route::delete('/kategori-produk/{id}', [KategoriProdukController::class, 'destroy']);

        // Ecourse
        Route::get('/ecourse/upload-url', [\App\Http\Controllers\EcourseController::class, 'getUploadUrl']);
        Route::get('/ecourse', [\App\Http\Controllers\EcourseController::class, 'index']);
        Route::get('/ecourse/{id}', [\App\Http\Controllers\EcourseController::class, 'show']);
        Route::post('/ecourse', [\App\Http\Controllers\EcourseController::class, 'store']);
        Route::delete('/ecourse/{id}', [\App\Http\Controllers\EcourseController::class, 'destroy']);

        // Sales
        Route::get('/sales-list', [\App\Http\Controllers\Api\Sales\SalesController::class, 'index']);
        Route::get('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'show']);
        Route::post('/sales-list', [\App\Http\Controllers\Api\Sales\SalesController::class, 'store']);
        Route::put('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'update']);
        Route::delete('/sales-list/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'destroy']);

        // Baileys WA Session Management
        Route::prefix('baileys')->group(function () {
            Route::get('/engine', [BaileysController::class, 'getEngine']);
            Route::get('/sessions', [BaileysController::class, 'listSessions']);
            Route::get('/status/{sessionId}', [BaileysController::class, 'getStatus']);
            Route::get('/status-by-sales/{salesId}', [BaileysController::class, 'getStatusBySales']);
            Route::get('/qr/{sessionId}', [BaileysController::class, 'getQr']);
            Route::get('/qr-by-sales/{salesId}', [BaileysController::class, 'getQrBySales']);
            Route::post('/init/{sessionId}', [BaileysController::class, 'createSession']);
            Route::post('/init-by-sales/{salesId}', [BaileysController::class, 'createSessionBySales']);
            Route::delete('/session/{sessionId}', [BaileysController::class, 'logout']);
            Route::delete('/session-by-sales/{salesId}', [BaileysController::class, 'logoutBySales']);
        });
        
        // Google Sync
        Route::get('/google-sync/status', [\App\Http\Controllers\GoogleOAuthController::class, 'status']);
        Route::get('/google-sync/url', [\App\Http\Controllers\GoogleOAuthController::class, 'getAuthUrl']);
        Route::post('/google-sync/disconnect', [\App\Http\Controllers\GoogleOAuthController::class, 'disconnect']);
        
        // Head Sales - Statistics & Performance
        Route::get('/statistics', [\App\Http\Controllers\Api\Sales\SalesController::class, 'statistics']);
        Route::get('/sales-performance/{id}', [\App\Http\Controllers\Api\Sales\SalesController::class, 'performance']);

        // Template Followup
        Route::post('/template-follup', [TemplateFollupController::class, 'index']);
        Route::post('/template-follup/store', [TemplateFollupController::class, 'store']);
        Route::post('/template-follup/update/{id}', [TemplateFollupController::class, 'store']);
        Route::delete('/template-follup/delete/{id}', [TemplateFollupController::class, 'destroy']);

        // Logs Followup
        Route::get('/logs-follup', [LogsFollupController::class, 'index']);

        // Log Pixel
        Route::get('/pixel-logs', [\App\Http\Controllers\Api\Sales\PixelLogController::class, 'index']);
        Route::post('/logs-follup', [LogsFollupController::class, 'show']);

        // Order
        Route::get('/order', [OrderCustomerController::class, 'index']);
        Route::get('/order/utm-filter-options', [OrderCustomerController::class, 'utmFilterOptions']);
        Route::get('/order/utm', [OrderUtmController::class, 'index']);
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
        Route::post('/order-admin/bulk', [OrderCustomerController::class, 'store_admin_bulk']);

        // Invitation
        Route::get('/invitation', [InvitationController::class, 'index']);
        Route::get('/invitation/{id}', [InvitationController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/invitation-admin', [InvitationController::class, 'store']);
        Route::put('/invitation/{id}', [InvitationController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/invitation/{id}', [InvitationController::class, 'destroy'])->where('id', '[0-9]+');

        // Kehadiran Produk (Seminar/Workshop Attendance)
        Route::get('/kehadiran', [ProdukJadwalKehadiranController::class, 'index']);
        Route::post('/kehadiran', [ProdukJadwalKehadiranController::class, 'store']);
        Route::delete('/kehadiran/{id}', [ProdukJadwalKehadiranController::class, 'destroy'])->where('id', '[0-9]+');

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

        // Zoom Recording Links (1 produk : many)
        Route::get('/zoom-record/{produkId}', [ZoomRecordController::class, 'index']);
        Route::post('/zoom-record', [ZoomRecordController::class, 'store']);
        Route::delete('/zoom-record/{id}', [ZoomRecordController::class, 'destroy']);

        // Order resi (Biteship) — simpan waybill, jadwal, status
        Route::get('/order-resi', [OrderResiController::class, 'index']);
        Route::get('/order-resi/order/{orderId}', [OrderResiController::class, 'indexByOrder'])->where('orderId', '[0-9]+');
        Route::get('/order-resi/{id}', [OrderResiController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/order-resi', [OrderResiController::class, 'store']);
        Route::post('/order-resi/{id}/sync', [OrderResiController::class, 'sync'])->where('id', '[0-9]+');
        Route::get('/order-resi/{id}/label', [OrderResiController::class, 'label'])->where('id', '[0-9]+');
        Route::get('/order-resi/{id}/tracking', [OrderResiController::class, 'trackingDetail'])->where('id', '[0-9]+');
        Route::get('/order-resi/print-custom-label', [OrderResiController::class, 'printCustomLabel']);

        // Broadcast
        Route::get('/broadcast', [BroadcastController::class, 'index']);
        Route::get('/broadcast/my-broadcast', [BroadcastController::class, 'indexByUser']);
        Route::post('/broadcast', [BroadcastController::class, 'store']);
        Route::post('/broadcast/per-sales', [BroadcastController::class, 'storeForMySales']);
        Route::post('/broadcast/parse-excel', [BroadcastController::class, 'parseExcel']); // harus sebelum {id}
        Route::get('/broadcast/{id}', [BroadcastController::class, 'show']);
        Route::get('/broadcast/{id}/penerima', [BroadcastController::class, 'penerima']);
        Route::put('/broadcast/{id}', [BroadcastController::class, 'update']);
        Route::delete('/broadcast/{id}', [BroadcastController::class, 'destroy']);
        Route::post('/broadcast/{id}/send-sales', [BroadcastController::class, 'sendToMySales']);
        Route::post('/broadcast/{id}/send', [BroadcastController::class, 'send']);

        // Template Broadcast
        Route::get('/template-broadcast', [TemplateBroadcastController::class, 'index']);
        Route::post('/template-broadcast', [TemplateBroadcastController::class, 'store']);
        Route::put('/template-broadcast/{id}', [TemplateBroadcastController::class, 'update']);
        Route::delete('/template-broadcast/{id}', [TemplateBroadcastController::class, 'destroy']);

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

        // AI Leads (dari tabel ai_leads)
        Route::get('/lead-ai', [\App\Http\Controllers\Api\Sales\LeadAiController::class, 'index']);
        Route::get('/lead-ai/statistics', [\App\Http\Controllers\Api\Sales\LeadAiController::class, 'statistics']);
        Route::get('/lead-ai/{id}', [\App\Http\Controllers\Api\Sales\LeadAiController::class, 'show']);
        Route::put('/lead-ai/{id}', [\App\Http\Controllers\Api\Sales\LeadAiController::class, 'update']);
        Route::delete('/lead-ai/{id}', [\App\Http\Controllers\Api\Sales\LeadAiController::class, 'destroy']);

        // Percakapan
        Route::get('/percakapan', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'index']);
        Route::get('/percakapan/{id}', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'show']);
        Route::post('/percakapan', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'store']);
        Route::put('/percakapan/{id}', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'update']);
        Route::post('/percakapan/{id}/message', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'addMessage']);
        Route::post('/percakapan/get-or-create', [\App\Http\Controllers\Api\Sales\PercakapanController::class, 'getOrCreateByPhone']);

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
   
    // Post Management (Admin Only)
    Route::get('/post', [PostController::class, 'index']);
    Route::get('/post/{id}', [PostController::class, 'show'])->where('id', '[0-9]+');
    Route::post('/post', [PostController::class, 'store']);
    Route::put('/post/{id}', [PostController::class, 'update']);
    Route::delete('/post/{id}', [PostController::class, 'destroy']);
   
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

        // Type Cuti
        Route::get('/type-cuti', [HrTypeCutiController::class, 'index']);
        Route::post('/type-cuti', [HrTypeCutiController::class, 'store']);
        Route::put('/type-cuti/{id}', [HrTypeCutiController::class, 'update']);
        Route::delete('/type-cuti/{id}', [HrTypeCutiController::class, 'destroy']);
        
        // Karyawan
        Route::get('/karyawan', [HrKaryawanController::class, 'index']);
        Route::get('/karyawan/by-current-user', [HrKaryawanController::class, 'getByCurrentUser']);
        Route::get('/karyawan/direksi', [HrKaryawanController::class, 'getDireksi']);
        Route::get('/karyawan/{id}', [HrKaryawanController::class, 'show']);
        Route::post('/karyawan', [HrKaryawanController::class, 'store']);
        Route::put('/karyawan/{id}', [HrKaryawanController::class, 'update']);
        Route::delete('/karyawan/{id}', [HrKaryawanController::class, 'destroy']);

        // Struktur Organisasi (Org Chart)
        Route::get('/org-chart', [\App\Http\Controllers\Api\Hr\HrOrgChartController::class, 'index']);
        Route::post('/org-chart/save', [\App\Http\Controllers\Api\Hr\HrOrgChartController::class, 'save']);

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

        // Cuti
        Route::get('/cuti', [HrCutiController::class, 'index']);
        Route::get('/cuti/{id}', [HrCutiController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/cuti', [HrCutiController::class, 'store']);
        Route::put('/cuti/{id}', [HrCutiController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/cuti/{id}', [HrCutiController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/cuti/{id}/approve', [HrCutiController::class, 'approve'])->where('id', '[0-9]+');
        Route::post('/cuti/{id}/reject', [HrCutiController::class, 'reject'])->where('id', '[0-9]+');

        // Izin
        Route::get('/izin', [HrIzinController::class, 'index']);
        Route::get('/izin/by-current-user', [HrIzinController::class, 'getByCurrentUser']);
        Route::get('/izin/{id}', [HrIzinController::class, 'show'])->where('id', '[0-9]+');
        Route::post('/izin', [HrIzinController::class, 'storeByCurrentUser']); // Untuk user yang input sendiri
        Route::post('/izin/admin', [HrIzinController::class, 'store']); // Untuk admin/HR yang input manual
        Route::put('/izin/{id}', [HrIzinController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/izin/{id}', [HrIzinController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/izin/{id}/approve', [HrIzinController::class, 'approve'])->where('id', '[0-9]+');
        
        // Setting
        Route::get('/setting', [HrSettingController::class, 'index']);
        Route::post('/setting', [HrSettingController::class, 'store']);
        Route::put('/setting/{id}', [HrSettingController::class, 'update']);

        // Todo List Management (HR only)
        Route::get('/todo-list', [HrTodoListController::class, 'index']);
        Route::get('/todo-list/statistics', [HrTodoListController::class, 'statistics']);
    });

    // Todo List - Available for all authenticated users
    Route::prefix('todo-list')->group(function () {
        Route::get('/', [TodoListController::class, 'index']);
        Route::get('/my-todos', [TodoListController::class, 'myTodos']);
        Route::get('/{id}', [TodoListController::class, 'show']);
        Route::post('/', [TodoListController::class, 'store']);
        Route::put('/{id}', [TodoListController::class, 'update']);
        Route::delete('/{id}', [TodoListController::class, 'destroy']);
        Route::post('/{id}/complete', [TodoListController::class, 'complete']);
    });

    Route::prefix('marketing')->group(function () {
        Route::get('/dashboard', [MarketingDashboardController::class, 'index']);
    });


});


Route::prefix('customer')->group(function () {
    // Public Customer Routes
    Route::post('/otp/verify', [OtpCustomerController::class, 'verifyOtp']);
    Route::post('/login', LoginCustomerController::class);

    // Phone-based Login Flow (New)
    Route::post('/check-phone', [LoginCustomerController::class, 'checkPhone']);
    Route::post('/send-otp-by-phone', [LoginCustomerController::class, 'sendOtpByPhone']);
    Route::post('/verify-otp-set-password', [LoginCustomerController::class, 'verifyOtpAndSetPassword']);
    Route::post('/login-password', [LoginCustomerController::class, 'loginWithPassword']);

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
    Route::get('/absensi', [\App\Http\Controllers\Api\Hr\HrAbsensiController::class, 'getByCurrentUser']);
    Route::get('/cuti', [\App\Http\Controllers\Api\Hr\HrCutiController::class, 'getByCurrentUser']);
    Route::post('/cuti', [\App\Http\Controllers\Api\Hr\HrCutiController::class, 'storeByCurrentUser']);
});
