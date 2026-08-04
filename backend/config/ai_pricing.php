<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Harga model Claude (USD per 1 juta token)
    |--------------------------------------------------------------------------
    |
    | Dipakai AiUsageLogger untuk estimasi biaya tiap panggilan. Update kalau
    | Anthropic mengubah harga - jangan andalkan hasil estimasi ini untuk
    | rekonsiliasi tagihan resmi, itu tetap harus dari invoice Anthropic.
    |
    | cache_write_5m/1h dan cache_read cuma relevan kalau kode memang pakai
    | prompt caching (cache_control) - sampai sekarang belum ada yang pakai,
    | disiapkan saja biar tidak perlu migration/kode baru nanti.
    |
    */
    'models' => [
        'claude-sonnet-5' => [
            'input' => 3.00,
            'output' => 15.00,
            'cache_write_5m' => 3.75,
            'cache_write_1h' => 6.00,
            'cache_read' => 0.30,
        ],
        'claude-haiku-4-5-20251001' => [
            'input' => 1.00,
            'output' => 5.00,
            'cache_write_5m' => 1.25,
            'cache_write_1h' => 2.00,
            'cache_read' => 0.10,
        ],
    ],

];
