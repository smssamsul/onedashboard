<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Meta Marketing API version
    |--------------------------------------------------------------------------
    |
    | Dipakai oleh MetaAdsService untuk semua pemanggilan Graph API.
    | Naikkan berkala mengikuti versi stabil Meta terbaru.
    |
    */
    'api_version' => env('META_ADS_API_VERSION', 'v21.0'),

    'base_url' => env('META_ADS_BASE_URL', 'https://graph.facebook.com'),

];
