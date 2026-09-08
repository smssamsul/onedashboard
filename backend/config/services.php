<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'ultramsg' => [
        'instance_id' => env('ULTRAMSG_INSTANCE_ID'),
        'token'       => env('ULTRAMSG_TOKEN'),
    ],

    'cs' => [
        'whatsapp' => env('CS_WHATSAPP'),
    ],

    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
    ],

    'biteship' => [
        'base_url' => env('BITESHIP_BASE_URL', 'https://api.biteship.com'),
        'key' => env('BITESHIP_API_KEY', ''),
        // Dulu dibaca lewat env() langsung di Service/Controller - begitu ada
        // yang jalankan `php artisan config:cache` (bagian rutin prosedur deploy),
        // env() di luar file config berhenti baca .env dan selalu jatuh ke default
        // hardcode ("Warehouse" dkk), walau .env sudah diisi benar. Dipindah ke
        // sini supaya ikut ke-cache dengan benar dan tidak rusak lagi tiap deploy.
        'shipper_contact_name'  => env('BITESHIP_SHIPPER_CONTACT_NAME',  env('BITESHIP_ORIGIN_CONTACT_NAME', 'Shipper')),
        'shipper_contact_phone' => env('BITESHIP_SHIPPER_CONTACT_PHONE', env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890')),
        'shipper_organization'  => env('BITESHIP_SHIPPER_ORGANIZATION', ''),
        'origin_contact_name'   => env('BITESHIP_ORIGIN_CONTACT_NAME', 'Warehouse'),
        'origin_contact_phone'  => env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890'),
        'origin_address'        => env('BITESHIP_ORIGIN_ADDRESS', 'Jakarta'),
        'origin_postal_code'    => (int) env('BITESHIP_ORIGIN_POSTAL_CODE', 12440),
    ],

];
