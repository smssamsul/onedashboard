<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WoowaWebhookController extends Controller
{
    /**
     * Webhook untuk menerima data dari Woowa
     * Menampilkan semua data yang diterima di log
     */
    public function handle(Request $request)
    {
        // Ambil raw JSON content (seperti file_get_contents('php://input'))
        $rawContent = $request->getContent();
        
        // Decode JSON (seperti json_decode())
        $data = json_decode($rawContent, true);
        
        // Jika decode gagal, coba ambil dari request all
        if (json_last_error() !== JSON_ERROR_NONE) {
            $data = $request->all();
        }
        
        // Log dengan timestamp (seperti date("Y-m-d H:i:s :: "))
        $timestamp = now()->format('Y-m-d H:i:s');
        
        // Log data lengkap
        Log::info('Woowa Webhook Received', [
            'timestamp' => $timestamp,
            'raw_content' => $rawContent,
            'decoded_data' => $data,
            'headers' => $request->headers->all(),
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
        ]);
        
        // Log format yang mirip dengan contoh PHP (print_r format)
        Log::channel('daily')->info("Woowa Webhook :: {$timestamp} :: " . print_r($data, true));
        
        // Return response sukses
        return response()->json([
            'status' => 'success',
            'message' => 'Webhook received',
            'timestamp' => $timestamp
        ], 200);
    }
}
