<?php

return [

    'client_id' => env('DOKU_CLIENT_ID', ''),

    'secret_key' => env('DOKU_SECRET_KEY', ''),

    'is_production' => env('DOKU_IS_PRODUCTION', false),

    'base_url' => env('DOKU_IS_PRODUCTION', false)
        ? 'https://api.doku.com'
        : 'https://api-sandbox.doku.com',

    /*
    |--------------------------------------------------------------------------
    | DOKU Notification URL
    |--------------------------------------------------------------------------
    |
    | URL yang didaftarkan di DOKU Back Office untuk menerima notifikasi
    | perubahan status pembayaran, misalnya:
    | https://api.ternakproperti.com/api/doku/notification
    |
    */
    'notification_url' => env('DOKU_NOTIFICATION_URL', ''),

    'payment_due_date' => 60, // menit

];
