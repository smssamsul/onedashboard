<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Produk;
use App\Models\LeadLpwa;
use Illuminate\Support\Facades\Log;

class LpwaWebhookController extends Controller
{
    /**
     * Webhook untuk menerima pesan dari Baileys / Woowa untuk Lead LPWA
     */
    public function handleWebhook(Request $request)
    {
        Log::channel('webhook_baileys')->info('LPWA Webhook received:', $request->all());

        // Menangkap format payload yang mungkin bervariasi dari Baileys/Woowa
        $message = $request->input('message') ?? $request->input('text') ?? '';
        // Format dari user: sessionId, sender, senderName, message
        $phone = $request->input('sender') ?? $request->input('phone') ?? $request->input('wa') ?? '';
        $name = $request->input('senderName') ?? $request->input('pushName') ?? $request->input('name') ?? $request->input('nama') ?? $phone;
        $sessionId = $request->input('sessionId') ?? '';

        // Ekstrak sales_id dari sessionId dengan format "namasession_idsales"
        $salesId = null;
        if (!empty($sessionId) && strpos($sessionId, '_') !== false) {
            $parts = explode('_', $sessionId);
            $salesId = end($parts);
        }

        if (empty($message) || empty($phone)) {
            return response()->json([
                'success' => false, 
                'message' => 'Invalid payload. Message and phone are required.'
            ], 400);
        }

        // Bersihkan nomor WA (hanya angka)
        $phone = preg_replace('/\D/', '', $phone);

        // Regex untuk menangkap nama produk dari format:
        // "Halo Fuji saya mau ikut Seminar Ternak Properti di Lampung. Bisa didetilkan?"
        // Menangkap text setelah "ikut" sampai titik (.)
        $produkId = null;
        if (preg_match('/ikut\s+(.*?)(?:\.|\?|$)/i', $message, $matches)) {
            $rawProductName = trim($matches[1]);
            // Hilangkan kata " di " (case-insensitive) dan ganti dengan spasi
            $productName = trim(preg_replace('/\bdi\b/i', '', $rawProductName));
            
            // Sesuai request, ubah kata "Ternak" menjadi "Akuisisi"
            $productName = str_ireplace('Ternak', 'Akuisisi', $productName);

            // Hapus multiple spaces jika ada
            $productName = preg_replace('/\s+/', ' ', $productName);
            
            // Cocokkan nama produk dari kata kunci yang didapat, status = 1 atau status != N
            $produk = Produk::where('nama', 'LIKE', '%' . $productName . '%')
                ->where(function ($query) {
                    $query->where('status', '1')
                          ->orWhere('status', '!=', 'N');
                })
                ->first();
            
            if ($produk) {
                $produkId = $produk->id;
            } else {
                Log::channel('webhook_baileys')->warning('LPWA Webhook: Produk tidak ditemukan untuk kata kunci: ' . $productName . ' (dari raw: ' . $rawProductName . ')');
            }
        }

        // HANYA simpan jika produkId ditemukan
        if (!$produkId) {
            return response()->json([
                'success' => true,
                'message' => 'Pesan diterima, namun produk tidak terdeteksi atau tidak cocok, data diabaikan.'
            ]);
        }

        // Simpan ke lead_lpwas
        $lead = LeadLpwa::create([
            'nama' => $name,
            'no_wa' => $phone,
            'produk_id' => $produkId,
            'sales_id' => $salesId,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Lead LPWA berhasil ditambahkan',
            'data' => $lead
        ]);
    }
}
