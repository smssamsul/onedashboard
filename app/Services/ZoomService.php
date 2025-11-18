<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class ZoomService
{
    public static function getAccessToken()
    {
        $response = Http::asForm()
            ->withBasicAuth(env('ZOOM_CLIENT_ID'), env('ZOOM_CLIENT_SECRET'))
            ->post('https://zoom.us/oauth/token', [
                'grant_type' => 'account_credentials',
                'account_id' => env('ZOOM_ACCOUNT_ID'),
            ]);

        if ($response->failed()) {
            throw new \Exception('Gagal ambil Zoom access token: ' . $response->body());
        }

        return $response->json()['access_token'];
    }
}
