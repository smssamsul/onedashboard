<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeadLpwa;
use App\Services\PercakapanService;
use App\Services\ChatExtractorService;
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

        // Catat SETIAP pesan customer yang masuk ke menu Percakapan (AI),
        // ter-assign ke sales pemilik session WA-nya - terlepas dari
        // apakah pesannya cocok pola "ikut [produk]" di bawah atau tidak.
        // Gagal di sini tidak boleh menghentikan alur capture lead LPWA
        // yang sudah ada.
        try {
            app(PercakapanService::class)->logCustomerMessage(
                $phone,
                $salesId !== null ? (int) $salesId : null,
                $message,
                $name,
                'baileys'
            );
        } catch (\Throwable $e) {
            Log::channel('webhook_baileys')->error('Gagal mencatat ke Percakapan', [
                'phone' => $phone,
                'sessionId' => $sessionId,
                'error' => $e->getMessage(),
            ]);
        }

        // Parse produk yang diminati & lokasi dari pesan sebagai teks bebas -
        // tidak lagi dicocokkan ke katalog produk. Sebelumnya kalau nama produk
        // tidak match persis ke tabel produk, lead-nya dibuang begitu saja dan
        // tidak pernah masuk database. Sekarang selalu disimpan apa adanya,
        // biar sales yang menentukan produk sebenarnya saat klik "Order".
        $extracted = app(ChatExtractorService::class)->extract($message);
        $produkText = $extracted['product'] ?? null;
        $lokasi = $extracted['location'] ?? null;

        // Kalau pesan ini sama sekali tidak mengandung sinyal minat (tidak ada
        // produk maupun lokasi yang terdeteksi), jangan buat lead - supaya
        // tabel tidak kebanjiran obrolan yang tidak relevan.
        if (!$produkText && !$lokasi) {
            return response()->json([
                'success' => true,
                'message' => 'Pesan diterima, namun tidak ada sinyal minat produk/lokasi, data diabaikan.'
            ]);
        }

        // Upsert per nomor WA supaya "waktu chat pertama" (created_at) stabil
        // dan tidak bikin baris duplikat setiap kali customer yang sama chat lagi.
        $lead = LeadLpwa::where('no_wa', $phone)->first();

        if (!$lead) {
            $lead = LeadLpwa::create([
                'nama' => $name,
                'no_wa' => $phone,
                'produk_text' => $produkText,
                'lokasi' => $lokasi,
                'sales_id' => $salesId,
            ]);
        } else {
            $lead->update(array_filter([
                'nama' => $name ?: $lead->nama,
                'produk_text' => $produkText ?: $lead->produk_text,
                'lokasi' => $lokasi ?: $lead->lokasi,
                'sales_id' => $salesId ?: $lead->sales_id,
            ], fn ($v) => $v !== null));
        }

        return response()->json([
            'success' => true,
            'message' => 'Lead LPWA berhasil ditambahkan',
            'data' => $lead
        ]);
    }
}
