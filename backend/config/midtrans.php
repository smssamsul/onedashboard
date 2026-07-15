<?php

return [


    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),

    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),

    'server_key' => env('MIDTRANS_SERVER_KEY', ''),

    'is_production' => env('MIDTRANS_IS_PRODUCTION', false),

    /*
    |--------------------------------------------------------------------------
    | Midtrans Notification URL
    |--------------------------------------------------------------------------
    |
    | URL yang akan dipanggil oleh Midtrans untuk notifikasi pembayaran.
    | Biasanya berupa endpoint di aplikasi kamu, misalnya:
    | https://yourdomain.com/api/midtrans/notification
    |
    */
    'notification_url' => env('MIDTRANS_NOTIFICATION_URL', ''),


    'is_3ds' => true,


    'is_sanitized' => true,

];
