<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ZoomSdkController extends Controller
{
    public function generateSignature(Request $request)
    {
        $meetingNumber = $request->meetingNumber;
        $role = $request->role ?? 0; // 0 = participant, 1 = host

        $sdkKey = env('ZOOM_SDK_KEY');
        $sdkSecret = env('ZOOM_SDK_SECRET');

        $time = round(microtime(true) * 1000) - 30000;

        $data = base64_encode($sdkKey . $meetingNumber . $time . $role);

        $hash = hash_hmac('sha256', $data, $sdkSecret, true);
        $signature = rtrim(strtr(base64_encode($data . "." . $hash), '+/', '-_'), '=');

        return response()->json([
            'signature' => $signature,
            'sdkKey' => $sdkKey,
            'meetingNumber' => $meetingNumber,
            'role' => $role,
        ]);
    }
}
