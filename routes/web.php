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
    return redirect('/login');
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

Route::get('/sales/dashboard', [\App\Http\Controllers\SalesDashboardViewController::class, 'index'])->name('sales.dashboard');

Route::get('/sales/broadcast', function () {
    return view('sales.broadcast');
})->name('sales.broadcast');

Route::get('/sales/leads', function () {
    return view('sales.leads');
})->name('sales.leads');

// Sales biasa (level 2) routes
Route::get('/sales/dashboard-sales', function () {
    return view('sales.dashboard-sales');
})->name('sales.dashboard-sales');

Route::get('/sales/follow-today', function () {
    return view('sales.follow-today');
})->name('sales.follow-today');

Route::get('/sales/customer', function () {
    return view('sales.customer');
})->name('sales.customer');

Route::get('/sales/order', function () {
    return view('sales.order');
})->name('sales.order');

Route::get('/sales/produk', function () {
    return view('sales.produk');
})->name('sales.produk');

Route::get('/sales/absensi', function () {
    return view('sales.absensi');
})->name('sales.absensi');

Route::get('/sales/sales-list', function () {
    return view('sales.sales-list');
})->name('sales.sales-list');

// HR Routes
Route::get('/hr/dashboard', function () {
    return view('hr.dashboard');
})->name('hr.dashboard');

Route::get('/hr/karyawan', function () {
    return view('hr.karyawan');
})->name('hr.karyawan');

Route::get('/hr/departemen', function () {
    return view('hr.departemen');
})->name('hr.departemen');

Route::get('/hr/shift', function () {
    return view('hr.shift');
})->name('hr.shift');

Route::get('/hr/absensi', function () {
    return view('hr.absensi');
})->name('hr.absensi');

Route::get('/hr/cuti', function () {
    return view('hr.cuti');
})->name('hr.cuti');

Route::get('/hr/hari', function () {
    return view('hr.hari');
})->name('hr.hari');

Route::get('/hr/izin-telat', function () {
    return view('hr.izin-telat');
})->name('hr.izin-telat');

Route::get('/hr/setting', function () {
    return view('hr.setting');
})->name('hr.setting');

Route::get('/hr/laporan', function () {
    return view('hr.laporan');
})->name('hr.laporan');

Route::get('/finance/dashboard', function () {
    return view('finance.dashboard');
})->name('finance.dashboard');

Route::get('/finance/order-validation', function () {
    return view('finance.order-validation');
})->name('finance.order-validation');

Route::get('/marketing/dashboard', function () {
    return view('marketing.dashboard');
})->name('marketing.dashboard');

// User Routes (for regular users)
Route::get('/user/dashboard', function () {
    return view('user.dashboard');
})->name('user.dashboard');

Route::get('/user/absensi', function () {
    return view('user.absensi');
})->name('user.absensi');

Route::get('/user/task', function () {
    return view('user.task');
})->name('user.task');

Route::get('/user/profile', function () {
    return view('user.profile');
})->name('user.profile');

Route::get('/user/cuti', function () {
    return view('user.cuti');
})->name('user.cuti');

Route::get('/user/hari', function () {
    return view('user.hari');
})->name('user.hari');

Route::get('/user/izin-telat', function () {
    return view('user.izin-telat');
})->name('user.izin-telat');

Route::get('/customer/dashboard', [CustomerDashboardController::class, 'index'])->name('customer.dashboard');

Route::get('/customer/profile', function () {
    return view('customer.profile');
})->name('customer.profile');

// RabbitMQ Dashboard
Route::get('/admin/rabbitmq', [\App\Http\Controllers\Admin\RabbitMQDashboardController::class, 'index'])->name('admin.rabbitmq');

Route::get('/admin/customer', function () {
    return view('admin.customer');
})->name('admin.customer');

Route::get('/admin/customer-import', function () {
    return view('admin.customer-import');
})->name('admin.customer-import');

Route::get('/admin/order', function () {
    return view('admin.order');
})->name('admin.order');


Route::get('/debug', function () {
    return [
        'is_secure' => request()->isSecure(),
        'scheme' => request()->getScheme(),
        'url' => url()->current(),
    ];
});