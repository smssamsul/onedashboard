<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class VerifyHashKey
{
    public function handle(Request $request, Closure $next)
    {
        $clientHash = $request->header('X-API-Hash');
        $timestamp  = $request->header('X-API-Timestamp');

        if (!$clientHash || !$timestamp) {
            return response()->json(['message' => 'Missing authentication headers.'], 401);
        }

        
        if (abs(time() - (int) $timestamp) > 300) {
            return response()->json(['message' => 'Request expired.'], 401);
        }

        $secret = env('API_SECRET_KEY');
        $serverHash = hash_hmac('sha256', $timestamp, $secret);

        if (!hash_equals($serverHash, $clientHash)) {
            return response()->json(['message' => 'Invalid hash key.'], 401);
        }

        return $next($request);
    }
}