<?php

namespace App\Services;

use App\Services\VectorSearchService;
use App\Services\ClaudeChatService;
use App\Services\WoowaService;
use App\Services\RegistrationParserService;
use App\Services\SalesRoundRobinService;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use App\Models\Percakapan;
use App\Models\DetailPercakapan;
use App\Models\AiSetting;
use App\Models\AiLead;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class WhatsAppFlowService
{
    public function handle(string $from, string $message, ?int $productId = null)
    {
        // Check if message is registration data format
        $registrationParser = app(RegistrationParserService::class);
        if ($registrationParser->isRegistrationFormat($message)) {
            $registrationData = $registrationParser->parse($message);
            
            if ($registrationData) {
                $this->handleRegistration($from, $registrationData, $productId);
                return;
            } else {
                // Format tidak lengkap, minta lengkapi
                app(WoowaService::class)->sendMessage(
                    $from,
                    "Maaf kak, data yang dikirim belum lengkap. Mohon isi dengan format:\n\nNama: [nama lengkap]\nEmail: [email]\nNo Telp: [nomor WhatsApp]\nProduk yang diminati: [nama produk]"
                );
                return;
            }
        }
        
        // Check for quick reply keywords first (skip AI if found)
        $quickReply = $this->checkQuickReplies($message);
        if ($quickReply) {
            app(WoowaService::class)->sendMessage($from, $quickReply);
            
            Log::channel('woowa')->info('WhatsApp Flow Service: Quick reply sent', [
                'from' => $from,
                'message' => $message,
                'quick_reply' => $quickReply,
                'product_id' => $productId,
            ]);
            
            return;
        }
        
        // Check if AI is enabled
        $aiSetting = AiSetting::first();
        if (!$aiSetting || !$aiSetting->is_on) {
            Log::channel('woowa')->info('WhatsApp Flow Service: AI is disabled', [
                'from' => $from,
                'message' => $message,
            ]);
            return; // AI tidak aktif, tidak perlu memproses
        }
        
        // Get lead status for prompt selection
        $lead = AiLead::where('phone_number', $from)->first();
        $leadStatus = $lead ? strtolower(trim($lead->status ?? 'new')) : 'new';
        
        // Continue with AI flow if no quick reply and AI is enabled
        $contexts = app(VectorSearchService::class)
            ->search($message, $productId);

        // Pre-classification: apakah pesan relevan dengan produk/bisnis?
        if (!$this->isMessageRelevant($message)) {
            Log::channel('woowa')->info('WhatsApp Flow Service: Off-topic message, AI silent (no reply)', [
                'from'    => $from,
                'message' => $message,
            ]);
            return; // Diam total — tidak kirim apapun
        }

        $reply = app(ClaudeChatService::class)
            ->reply($message, $contexts, $leadStatus);

        app(WoowaService::class)
            ->sendMessage($from, $reply);

        // Save AI response to detail_percakapan
        try {
            $percakapan = Percakapan::where('phone_number', $from)->first();
            if ($percakapan) {
                DetailPercakapan::create([
                    'id_percakapan' => $percakapan->id,
                    'sender_type'   => 'AI',
                    'message_text'  => $reply,
                    'message_type'  => 'text',
                    'created_at'    => now(),
                ]);

                // Update last_message_at
                $percakapan->update([
                    'last_message_at' => now()
                ]);
            }
        } catch (\Exception $e) {
            Log::channel('woowa')->error('Error saving AI response to detail_percakapan', [
                'from'  => $from,
                'error' => $e->getMessage(),
            ]);
        }

        Log::channel('woowa')->info('WhatsApp Flow Service', [
            'from'       => $from,
            'message'    => $message,
            'reply'      => $reply,
            'product_id' => $productId,
        ]);
    }

    /**
     * Pre-classification: apakah pesan relevan dengan produk/bisnis?
     * Jika tidak relevan → return false → AI diam total.
     */
    private function isMessageRelevant(string $message): bool
    {
        // Pesan sangat pendek (1-2 kata) seperti sapaan biasa — cek keyword dulu
        $messageLower = strtolower(trim($message));
        $greetingOnlyPatterns = [
            '/^(halo|hai|hi|hei|hey|pagi|siang|sore|malam|p|s|m)[\s!.]*$/i',
            '/^(tes|test|coba|cek|ping)[\s!.]*$/i',
        ];
        foreach ($greetingOnlyPatterns as $pattern) {
            if (preg_match($pattern, $messageLower)) {
                // Sapaan saja tanpa konteks — biarkan AI menjawab (mungkin pembuka customer)
                return true;
            }
        }

        // Untuk pesan lebih panjang, gunakan Claude untuk klasifikasi cepat
        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'x-api-key'         => env('ANTHROPIC_API_KEY'),
                'anthropic-version' => '2023-06-01',
                'content-type'      => 'application/json',
            ])->post('https://api.anthropic.com/v1/messages', [
                'model'  => 'claude-haiku-4-5-20251001',
                'system' => 'Kamu adalah classifier pesan. Tugasmu: tentukan apakah pesan berikut relevan dengan konteks bisnis penjualan produk/layanan (pertanyaan produk, harga, pembelian, layanan, pengiriman, keluhan produk, dll). Jawab HANYA dengan satu kata: "ya" atau "tidak".',
                'messages' => [
                    ['role' => 'user', 'content' => $message]
                ],
                'temperature' => 0,
                'max_tokens'  => 5,
            ]);

            if ($response->successful()) {
                $answer = trim(strtolower($response->json('content.0.text') ?? 'ya'));
                $isRelevant = str_starts_with($answer, 'ya');

                Log::channel('woowa')->info('WhatsApp Flow Service: Off-topic check', [
                    'message'     => substr($message, 0, 100),
                    'is_relevant' => $isRelevant,
                    'raw_answer'  => $answer,
                ]);

                return $isRelevant;
            }
        } catch (\Exception $e) {
            Log::channel('woowa')->warning('WhatsApp Flow Service: Off-topic check failed, defaulting to relevant', [
                'error' => $e->getMessage(),
            ]);
        }

        // Jika gagal klasifikasi → anggap relevan (safe default)
        return true;
    }

    
    /**
     * Handle registration data from customer
     */
    private function handleRegistration(string $from, array $data, ?int $productId = null)
    {
        DB::beginTransaction();
        try {
            // Get or create customer
            $customer = Customer::where('wa', $from)->first();
            
            if (!$customer) {
                // Create new customer
                $customer = Customer::create([
                    'nama' => $data['nama'],
                    'email' => $data['email'] ?? null,
                    'wa' => $from,
                    'status' => '1',
                    'create_at' => now(),
                ]);
            } else {
                // Update existing customer
                $customer->update([
                    'nama' => $data['nama'],
                    'email' => $data['email'] ?? $customer->email,
                ]);
            }
            
            // Get sales using round-robin
            $roundRobinService = app(SalesRoundRobinService::class);
            $salesId = $roundRobinService->getNextSalesId($productId);
            
            if ($salesId) {
                // Update customer sales_id
                $customer->update(['sales_id' => $salesId]);
                
                // Create or update lead
                $lead = Lead::where('customer_id', $customer->id)->first();
                if ($lead) {
                    $lead->update([
                        'sales_id' => $salesId,
                        'minat_produk' => $data['produk'] ?? null,
                        'update_at' => now(),
                    ]);
                } else {
                    Lead::create([
                        'customer_id' => $customer->id,
                        'sales_id' => $salesId,
                        'lead_label' => 'WhatsApp Registration',
                        'status' => '1',
                        'minat_produk' => $data['produk'] ?? null,
                        'create_at' => now(),
                        'update_at' => now(),
                    ]);
                }
                
                // Get sales WhatsApp number from user no_telp
                $salesUser = User::find($salesId);
                
                if ($salesUser && !empty($salesUser->no_telp)) {
                    // Format phone number
                    $salesPhone = preg_replace('/[^0-9]/', '', $salesUser->no_telp);
                    if (substr($salesPhone, 0, 1) === '0') {
                        $salesPhone = '62' . substr($salesPhone, 1);
                    } elseif (substr($salesPhone, 0, 2) !== '62') {
                        $salesPhone = '62' . $salesPhone;
                    }
                    
                    $salesMessage = "Heyy ada lead baru dari AI nih, gercep lagsung follow up ya! *\n\n";
                    $salesMessage .= "Nama: {$data['nama']}\n";
                    $salesMessage .= "Email: " . ($data['email'] ?? '-') . "\n";
                    $salesMessage .= "No Telp: {$from}\n\n";
                    $salesMessage .= "Produk yang diminati: " . ($data['produk'] ?? '-') . "\n\n";
                    
                    app(WoowaService::class)->sendMessage($salesPhone, $salesMessage);
                    
                    Log::channel('woowa')->info('WhatsApp Flow Service: Registration sent to sales', [
                        'customer_id' => $customer->id,
                        'sales_id' => $salesId,
                        'sales_whatsapp' => $salesPhone,
                    ]);
                } else {
                    Log::channel('woowa')->warning('WhatsApp Flow Service: Sales user not found or no_telp is empty', [
                        'customer_id' => $customer->id,
                        'sales_id' => $salesId,
                    ]);
                }
                
                // Send confirmation to customer
                app(WoowaService::class)->sendMessage(
                    $from,
                    "Terima kasih kak {$data['nama']}! 😊\n\nData pendaftaran sudah aku terima dan akan segera di-follow up oleh tim sales kami. Tim sales akan menghubungi Anda segera ya!"
                );
            } else {
                // No sales available
                app(WoowaService::class)->sendMessage(
                    $from,
                    "Terima kasih kak {$data['nama']}! 😊\n\nData pendaftaran sudah aku terima. Tim kami akan menghubungi Anda segera ya!"
                );
                
                Log::channel('woowa')->warning('WhatsApp Flow Service: No sales available for registration', [
                    'customer_id' => $customer->id,
                ]);
            }
            
            DB::commit();
            
            Log::channel('woowa')->info('WhatsApp Flow Service: Registration processed', [
                'from' => $from,
                'customer_id' => $customer->id,
                'sales_id' => $salesId ?? null,
                'data' => $data,
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::channel('woowa')->error('WhatsApp Flow Service: Registration error', [
                'from' => $from,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            // Send error message to customer
            app(WoowaService::class)->sendMessage(
                $from,
                "Maaf kak, terjadi kesalahan saat memproses pendaftaran. Mohon coba lagi atau hubungi admin ya."
            );
        }
    }
    
    /**
     * Check if message contains keywords that require quick replies
     * Returns reply message if keyword found, null otherwise
     */
    private function checkQuickReplies(string $message): ?string
    {
        $messageLower = strtolower($message);
        
        $daftarKeywords = [
            'daftar',
            'mau daftar',
            'saya daftar',
            'ikut',
            'join',
            'mau ikut',
            'register'
        ];
        
        foreach ($daftarKeywords as $keyword) {
            if (str_contains($messageLower, $keyword)) {
                return "Siap kak 😊\nBoleh isi data ini ya biar aku bantu proses pendaftarannya:\n\nNama:\nEmail:\nNo Telp:\nProduk yang diminati:";
            }
        }
        
        return null; // No quick reply found, continue with AI
    }
}
