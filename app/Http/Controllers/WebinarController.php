<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use App\Models\Webinar;

class WebinarController extends Controller
{
    public function join($id)
    {
        $webinar = Webinar::findOrFail($id);

        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');
        $meetingNumber = $webinar->meeting_id;

        $iat = time() - 30; // waktu dibuat
        $exp = $iat + (60 * 60 * 2); // berlaku 2 jam

        $payload = [
            'sdkKey'   => $sdkKey,
            'appKey'   => $sdkKey, // ⚠️ wajib di SDK v4.x
            'mn'       => $meetingNumber,
            'role'     => 0, // 0 = peserta
            'iat'      => $iat,
            'exp'      => $exp,
            'tokenExp' => $exp,
        ];

        // langsung encode JWT tanpa base64 tambahan
        $signature = JWT::encode($payload, $sdkSecret, 'HS256');

        return view('webinar.join', [
            'meetingNumber' => $meetingNumber,
            'password'      => $webinar->password,
            'signature'     => $signature,
            'sdkKey'        => $sdkKey,
        ]);
    }

    public function join2($id)
    {
        // Contoh data meeting (nanti bisa dari database)
        $meetingNumber = '123456789'; // Ganti dengan meeting number kamu
        $password = '123456'; // Password meeting Zoom

        // Zoom SDK Credentials
        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');

        // Generate signature
        $role = 0; // 0 = peserta, 1 = host
        $signature = $this->generateSignature($sdkKey, $sdkSecret, $meetingNumber, $role);

        return view('webinar.join2', compact(
            'meetingNumber',
            'password',
            'sdkKey',
            'signature'
        ));
    }

    private function generateSignature($sdkKey, $sdkSecret, $meetingNumber, $role)
    {
        $iat = time();
        $exp = $iat + 60 * 60 * 2; // Berlaku 2 jam
        $payload = [
            'sdkKey' => $sdkKey,
            'mn' => $meetingNumber,
            'role' => $role,
            'iat' => $iat,
            'exp' => $exp,
            'appKey' => $sdkKey,
            'tokenExp' => $exp,
        ];

        return JWT::encode($payload, $sdkSecret, 'HS256');
    }
}