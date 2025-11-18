<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\ZoomSdkController;

use App\Http\Controllers\WebinarController;

Route::get('/webinar/join/{meeting_id}', [WebinarController::class, 'join'])->name('webinar.join');

Route::get('/webinar/join2/{id}', [WebinarController::class, 'join2'])->name('webinar.join2');

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

Route::get('/admin/dashboard', function () {
    return view('admin.dashboard');
})->name('admin.dashboard');

Route::get('/sales/dashboard', function () {
    return view('sales.dashboard');
})->name('sales.dashboard');
