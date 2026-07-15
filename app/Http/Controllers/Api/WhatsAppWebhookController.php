<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\WhatsAppFlowService;
use App\Services\ChatExtractorService;
use App\Services\ClaudeIntentClassifierService;
use App\Models\AiLead;
use App\Models\Percakapan;
use App\Models\DetailPercakapan;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class WhatsAppWebhookController extends Controller
{
    public function handle(Request $request)
    {
        Log::channel('woowa')->info('WhatsApp Webhook Received', [
            'full_request' => $request->all(),
            'headers' => $request->headers->all(),
            'timestamp' => now()->toDateTimeString()
        ]);

        $payload = $request->all();

        /**
         * Normalisasi payload:
         * - Woowa contoh payload:
         *   {
         *     "contact_name": "628990550113",
         *     "message": "Hallo",
         *     "direction": "incoming",
         *     ...
         *   }
         *
         * - UltraMsg lama (untuk referensi) ada di field "data"
         */

        // Ambil direction
        $direction = $payload['direction'] ?? ($payload['full_request']['direction'] ?? null);
        $directionLower = $direction ? strtolower($direction) : null;

        // Mapping nomor dan pesan dari Woowa
        $from = $payload['contact_name'] ?? ($payload['full_request']['contact_name'] ?? null);
        $message = $payload['message'] ?? ($payload['full_request']['message'] ?? null);
        $senderName = $payload['sender_name'] ?? ($payload['full_request']['sender_name'] ?? null);

        // Fallback ke struktur lama jika ada field "data"
        if (!$from || !$message) {
            $data = $request->input('data', []);
            $fromRaw = $data['from'] ?? null;
            $from = $fromRaw ? preg_replace('/@c\.us$/', '', $fromRaw) : $from;
            $message = $data['body'] ?? $message;
            $senderName = $data['sender_name'] ?? $senderName;
        }

        // Format nomor telepon jika perlu
        if ($from) {
            $from = $this->formatPhoneNumber($from);
        }

        $productId = $request->input('product_id');

        Log::channel('woowa')->info('WhatsApp Webhook Processed', [
            'from' => $from,
            'message' => $message,
            'product_id' => $productId,
            'direction' => $direction,
            'sender_name' => $senderName,
        ]);

        // Handle outgoing messages (pesan dari sales)
        if ($directionLower === 'outgoing' && $from && $message) {
            $this->handleOutgoingMessage($from, $message);
            return response()->json(['status' => 'ok']);
        }

        // Handle incoming messages (pesan dari customer)
        if ($directionLower === 'incoming' && $from && $message) {
            // Create or update AI lead for new incoming messages
            $intentClassified = $this->createOrUpdateAiLead($from, $message, $payload);
            
            // Periksa status percakapan (bisa jadi sudah 'hot' atau 'danger' dari pesan sebelumnya)
            $percakapan = Percakapan::where('phone_number', $from)->first();
            $statusPercakapan = $percakapan ? strtolower(trim($percakapan->status)) : '';

            // AI berhenti beroperasi jika status percakapan danger atau hot
            if ($statusPercakapan === 'danger' || $statusPercakapan === 'hot') {
                Log::channel('woowa')->info('WhatsApp Flow Service skipped: Conversation status is ' . $statusPercakapan, [
                    'from' => $from,
                    'intent' => $intentClassified
                ]);
            } else {
                app(WhatsAppFlowService::class)
                    ->handle($from, $message, $productId);
            }
        } else if (!$directionLower || $directionLower !== 'incoming') {
            // Jika bukan incoming dan bukan outgoing, log dan ignore
            Log::channel('woowa')->info('WhatsApp Webhook ignored (unknown direction)', [
                'direction' => $direction,
            ]);
        } else {
            Log::channel('woowa')->warning('WhatsApp Webhook: Missing from or message', [
                'from' => $from,
                'message' => $message,
                'payload' => $payload
            ]);
        }

        return response()->json(['status' => 'ok']);
    }

    /**
     * Create or update AI lead for incoming messages
     */
    private function createOrUpdateAiLead(string $phoneNumber, string $message, array $payload)
    {
        try {
            DB::beginTransaction();

            // Get sender_name from payload - check both direct and nested full_request
            $senderName = $payload['sender_name'] 
                ?? ($payload['full_request']['sender_name'] ?? null)
                ?? ($payload['full_request']['contact_name'] ?? null); // Fallback to contact_name if sender_name not available
            
            // Get or create conversation (percakapan)
            $percakapan = Percakapan::where('phone_number', $phoneNumber)->first();
            
            // Check if conversation is already hot or danger
            $statusPercakapan = $percakapan ? strtolower(trim($percakapan->status)) : 'new';
            $isStopped = ($statusPercakapan === 'hot' || $statusPercakapan === 'danger');

            // Check if lead exists
            $lead = AiLead::where('phone_number', $phoneNumber)->first();

            if (!$lead) {
                // Create new lead - extract produk dan lokasi dari first_message
                $extractor = app(ChatExtractorService::class);
                $extracted = $extractor->extract($message);
                
                // Jika ChatExtractorService tidak menemukan product, gunakan IntentClassifierService
                $product = $extracted['product'] ?? null;
                if (empty($product) && !$isStopped) {
                    $classifier = app(ClaudeIntentClassifierService::class);
                    $intent = $classifier->classify($message);
                    
                    if ($intent !== 'tidak_jelas') {
                        $product = $intent;
                    }
                }
                
                $lead = AiLead::create([
                    'name' => $senderName,
                    'phone_number' => $phoneNumber,
                    'first_message' => $message,
                    'source' => 'whatsapp',
                    'status' => 'new',
                    'lead_score' => 0,
                    'last_reply_at' => now(),
                    'product' => $product,
                    'location' => $extracted['location'] ?? null,
                    'create_at' => now(),
                    'update_at' => now(),
                ]);

                Log::channel('woowa')->info('AI Lead created from webhook', [
                    'phone_number' => $phoneNumber,
                    'name' => $senderName,
                    'lead_id' => $lead->id,
                    'product' => $product,
                    'location' => $extracted['location'] ?? null,
                ]);
            } else {
                // Update existing lead
                $updateData = [
                    'last_reply_at' => now(),
                    'update_at' => now(),
                ];

                // Update name if not set and sender_name is available
                if (empty($lead->name) && $senderName) {
                    $updateData['name'] = $senderName;
                }
                
                // Jika product belum terisi, coba ekstrak intent dari chat
                if (empty($lead->product) && !$isStopped) {
                    $classifier = app(ClaudeIntentClassifierService::class);
                    $intent = $classifier->classify($message);
                    
                    if ($intent !== 'tidak_jelas') {
                        $updateData['product'] = $intent;
                        
                        Log::channel('woowa')->info('AI Lead product updated with intent', [
                            'phone_number' => $phoneNumber,
                            'intent' => $intent,
                            'message' => substr($message, 0, 100)
                        ]);
                    }
                }
                
                $lead->update($updateData);
            }

            if (!$percakapan) {
                $percakapan = Percakapan::create([
                    'ai_leads_id' => $lead->id,
                    'phone_number' => $phoneNumber,
                    'status' => 'new',
                    'source' => 'whatsapp',
                    'lead_score' => 0,
                    'last_message_at' => now(),
                ]);
            } else {
                // Update conversation
                $percakapan->update([
                    'ai_leads_id' => $lead->id,
                    'last_message_at' => now(),
                ]);
            }

            // Tentukan intent pesan (jika tidak distop)
            $chatIntent = 'neutral';
            if (!$isStopped) {
                $sentimentClassifier = app(\App\Services\ClaudeChatSentimentService::class);
                $chatIntent = $sentimentClassifier->classify($message);
            }

            // Tentukan status baru berdasarkan intent
            $newStatus = null;
            if (!$isStopped) {
                if ($chatIntent === 'hot' || $chatIntent === 'warm') {
                    $newStatus = $chatIntent;
                } elseif ($chatIntent === 'negatif') {
                    $newStatus = 'danger'; // Gunakan status 'danger' jika intent negatif
                }
            }

            // Update status AiLead dan Percakapan
            if ($newStatus) {
                // Update Percakapan
                $percakapan->update([
                    'status' => $newStatus,
                ]);

                // Update AiLead
                if (isset($lead)) {
                    $lead->update([
                        'status' => $newStatus,
                        'update_at' => now(),
                    ]);
                }
            }

            // Save message to detail_percakapan
            DetailPercakapan::create([
                'id_percakapan' => $percakapan->id,
                'sender_type' => 'customer',
                'message_text' => $message,
                'message_type' => 'text',
                'intent' => $chatIntent,
                'created_at' => now()->format('Y-m-d H:i:s'),
            ]);

            DB::commit();

            Log::channel('woowa')->info('AI Lead and conversation updated from webhook', [
                'phone_number' => $phoneNumber,
                'lead_id' => $lead->id ?? null,
                'percakapan_id' => $percakapan->id,
                'chat_intent' => $chatIntent,
                'new_status' => $newStatus
            ]);
            
            return $chatIntent;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::channel('woowa')->error('Error creating/updating AI lead from webhook', [
                'phone_number' => $phoneNumber,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            
            return 'neutral';
        }
    }

    /**
     * Handle outgoing messages (pesan dari sales)
     * 
     * @param string $phone
     * @param string $message
     * @return void
     */
    private function handleOutgoingMessage(string $phone, string $message)
    {
        try {
            // Get or create conversation berdasarkan phone_number
            $percakapan = Percakapan::where('phone_number', $phone)->first();
            
            if (!$percakapan) {
                $percakapan = Percakapan::create([
                    'phone_number' => $phone,
                    'status' => '',
                    'source' => 'whatsapp',
                    'lead_score' => 0,
                    'last_message_at' => now(),
                ]);
            }

            // Cek apakah ada pesan yang sama dalam 30 detik terakhir
            $thirtySecondsAgo = now()->subSeconds(30);
            $duplicateMessage = DetailPercakapan::where('id_percakapan', $percakapan->id)
                ->where('message_text', $message)
                ->where('created_at', '>=', $thirtySecondsAgo)
                ->first();

            if ($duplicateMessage) {
                Log::channel('woowa')->info('Outgoing message rejected (duplicate within 30 seconds)', [
                    'phone' => $phone,
                    'percakapan_id' => $percakapan->id,
                    'message_preview' => substr($message, 0, 50) . '...',
                    'duplicate_id' => $duplicateMessage->id,
                    'duplicate_created_at' => $duplicateMessage->created_at
                ]);
                return;
            }

            // Save outgoing message dengan sender_type "sales"
            DB::table('detail_percakapan')->insert([
                'id_percakapan' => $percakapan->id,
                'sender_type' => 'sales',
                'message_text' => $message,
                'message_type' => 'text',
                'created_at' => now()->format('Y-m-d H:i:s'),
            ]);

            // Update last_message_at
            $percakapan->update([
                'last_message_at' => now()
            ]);

            // Auto-update lead status to "lead" if message count is 2-3
            $messageCount = DB::table('detail_percakapan')
                ->where('id_percakapan', $percakapan->id)
                ->count();
            
            if ($messageCount >= 2 && $messageCount <= 3) {
                $lead = AiLead::where('phone_number', $phone)->first();
                // Update jika status masih new/NEW atau belum di-set ke lead/hot/warm/cold
                if ($lead) {
                    $currentStatus = strtolower(trim($lead->status ?? ''));
                    if (in_array($currentStatus, ['new', '', null])) {
                        $oldStatus = $lead->status;
                        $lead->update([
                            'status' => 'lead',
                            'updated_at' => now()
                        ]);
                        Log::channel('woowa')->info('Lead status auto-updated to lead from outgoing message', [
                            'lead_id' => $lead->id,
                            'phone_number' => $phone,
                            'message_count' => $messageCount,
                            'old_status' => $oldStatus,
                            'new_status' => 'lead'
                        ]);
                    }
                }
            }

            Log::channel('woowa')->info('Outgoing message saved', [
                'phone' => $phone,
                'percakapan_id' => $percakapan->id,
                'message_preview' => substr($message, 0, 50) . '...'
            ]);

        } catch (\Exception $e) {
            Log::channel('woowa')->error('Error saving outgoing message', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Format nomor telepon ke format standar (62xxxxxxxxxx)
     */
    private function formatPhoneNumber($phone)
    {
        // Hapus karakter non-digit
        $phone = preg_replace('/[^0-9]/', '', $phone);
        
        // Jika dimulai dengan 0, ganti dengan 62
        if (substr($phone, 0, 1) == '0') {
            $phone = '62' . substr($phone, 1);
        } 
        // Jika tidak dimulai dengan 62, tambahkan 62
        elseif (substr($phone, 0, 2) != '62') {
            $phone = '62' . $phone;
        }
        
        return $phone;
    }
}
