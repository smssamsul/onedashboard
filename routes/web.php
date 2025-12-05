<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ZoomSdkController;
use App\Http\Controllers\WebinarController;
use App\Http\Controllers\CustomerDashboardController;

Route::get('/webinar/join/{meeting_id}', [WebinarController::class, 'join'])->name('webinar.join');

Route::get('/webinar/join2/{id}', [WebinarController::class, 'join2'])->name('webinar.join2');

// Route untuk join webinar dari order customer
// Verifikasi dilakukan di controller menggunakan token dari request
Route::get('/customer/order/{orderId}/join', [WebinarController::class, 'joinFromOrder'])->name('customer.order.join');

Route::get('/zoom/signature', [ZoomSdkController::class, 'generateSignature']);

Route::get('/', function () {
    return view('welcome');
});

Route::get('/midtrans', function () {
    return view('midtrans');
});


Route::get('/login', function () {
    return view('login');
});

Route::get('/customer/login', function () {
    return view('customerLogin');
});

Route::get('/customer/verify-otp', function () {
    // Halaman verify-otp hanya bisa diakses setelah login
    // Check token akan dilakukan di JavaScript
    return view('customerVerifyOtp');
})->name('customer.verify.otp');

Route::get('/admin/dashboard', function () {
    return view('admin.dashboard');
})->name('admin.dashboard');

Route::get('/sales/dashboard', function () {
    return view('sales.dashboard');
})->name('sales.dashboard');

Route::get('/hr/dashboard', function () {
    return view('hr.dashboard');
})->name('hr.dashboard');

Route::get('/finance/dashboard', function () {
    return view('finance.dashboard');
})->name('finance.dashboard');

Route::get('/finance/order-validation', function () {
    return view('finance.order-validation');
})->name('finance.order-validation');

Route::get('/marketing/dashboard', function () {
    return view('marketing.dashboard');
})->name('marketing.dashboard');

Route::get('/customer/dashboard', [CustomerDashboardController::class, 'index'])->name('customer.dashboard');

// RabbitMQ Dashboard
Route::get('/admin/rabbitmq', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'index'])->name('admin.rabbitmq');
