<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class VerifyHashKey
{
    public function handle(Request $request, Closure $next)
    {
        // Pastikan response selalu JSON
        $request->headers->set('Accept', 'application/json');
        
        $clientHash = $request->header('X-API-Hash');
        $timestamp  = $request->header('X-API-Timestamp');

        if (!$clientHash || !$timestamp) {
            return response()->json([
                'success' => false,
                'message' => 'Missing authentication headers.',
                'required_headers' => [
                    'X-API-Hash' => 'required',
                    'X-API-Timestamp' => 'required (unix timestamp)'
                ]
            ], 401)->header('Content-Type', 'application/json');
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return response()->json([
                'success' => false,
                'message' => 'Request expired.',
                'timestamp_diff' => abs(time() - (int) $timestamp)
            ], 401)->header('Content-Type', 'application/json');
        }

        $secret = env('API_SECRET_KEY');
        
        if (!$secret) {
            return response()->json([
                'success' => false,
                'message' => 'Server configuration error: API_SECRET_KEY not set.'
            ], 500)->header('Content-Type', 'application/json');
        }
        
        $serverHash = hash_hmac('sha256', $timestamp, $secret);

        if (!hash_equals($serverHash, $clientHash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid hash key.',
                'hint' => 'Make sure you generate the hash correctly: hash_hmac("sha256", timestamp, API_SECRET_KEY)'
            ], 401)->header('Content-Type', 'application/json');
        }

        return $next($request);
    }
}