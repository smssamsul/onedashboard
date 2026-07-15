<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\BroadcastPenerima;
use App\Models\Produk;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;

class SendBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $broadcastId,
        public string $message,
        public string $woowaKey,
        public int $orderId,
        public int $customerId,
        public ?int $userId = null
    ) {
        // Queue untuk broadcast
        $this->onQueue('broadcast');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $order = null;
        $customer = null;
        $response = null;
        $responseData = null;

        try {
            $order = OrderCustomer::with(['customer_rel', 'produk_rel'])->find($this->orderId);
            $customer = Customer::find($this->customerId);

            if (!$order || !$customer || !$customer->wa) {
                Log::channel('broadcast')->warning('SendBroadcastJob: Data tidak lengkap', [
                    'broadcast_id' => $this->broadcastId,
                    'order_id' => $this->orderId,
                    'customer_id' => $this->customerId
                ]);

                // Simpan ke broadcast_penerima dengan status gagal jika customer ada
                if ($customer && $customer->wa) {
                    $this->saveBroadcastPenerima(
                        $customer->wa,
                        '0',
                        'Data tidak lengkap: Order atau Customer tidak ditemukan',
                        $this->message
                    );
                }

                return;
            }

            // Prepare data for template rendering
            $produk = $order->produk_rel;
            $customData = json_decode($order->custom_value, true) ?? [];
            
            if (!is_array($customData)) {
                $customData = [];
            }

            $templateData = array_merge([
                'customer_name' => $customer->nama ?? '',
                'product_name'  => $produk ? ($produk->nama ?? '') : '',
                'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : '',
                'order_total'   => $order->total_harga ? number_format((float)$order->total_harga, 0, ',', '.') : '0',
            ], $customData);

            // Render message dengan TemplateHelper
            try {
                $renderedMessage = TemplateHelper::render($this->message, $templateData);
            } catch (\Exception $renderError) {
                Log::channel('broadcast')->error('Error rendering broadcast message', [
                    'broadcast_id' => $this->broadcastId,
                    'error' => $renderError->getMessage(),
                    'message' => substr($this->message, 0, 100)
                ]);
                // Fallback: gunakan message asli jika render gagal
                $renderedMessage = $this->message;
            }

            Log::channel('broadcast')->info('Mengirim Broadcast via Queue', [
                'broadcast_id' => $this->broadcastId,
                'phone' => $customer->wa,
                'customer_id' => $this->customerId,
                'message_original' => substr($this->message, 0, 50) . '...',
                'message_rendered' => substr($renderedMessage, 0, 50) . '...'
            ]);

            $waSender = app(\App\Services\WhatsAppSenderService::class);
            
            // Ambil salesId dari customer
            $salesId = $customer->sales_id ?? null;
            
            $response = $waSender->sendMessage($customer->wa, $renderedMessage, $salesId, $this->woowaKey);

            if ($response->successful()) {
                Log::channel('broadcast')->info('Broadcast berhasil dikirim via Queue', [
                    'broadcast_id' => $this->broadcastId,
                    'phone' => $customer->wa,
                    'customer_id' => $this->customerId,
                    'response' => $response->json()
                ]);

                // Simpan ke broadcast_penerima dengan status berhasil
                $this->saveBroadcastPenerima(
                    $customer->wa,
                    '1',
                    json_encode($response->json()),
                    $renderedMessage
                );
            } else {
                Log::channel('broadcast')->error('Gagal kirim Broadcast via Queue', [
                    'broadcast_id' => $this->broadcastId,
                    'phone' => $customer->wa,
                    'status_or_response' => $response->status(),
                    'response_json' => $response->json(),
                    'woowa_key' => $this->woowaKey,
                ]);

                // Simpan ke broadcast_penerima dengan status gagal
                $this->saveBroadcastPenerima(
                    $customer->wa,
                    '0',
                    json_encode($response->json() ?? ['error' => 'Gagal via WA Sender', 'status' => $response->status()]),
                    $renderedMessage
                );
                
                throw new \Exception('Gagal mengirim Broadcast: ' . json_encode($response->json()));
            }

        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Error di SendBroadcastJob', [
                'broadcast_id' => $this->broadcastId,
                'order_id' => $this->orderId,
                'customer_id' => $this->customerId,
                'error' => $e->getMessage()
            ]);

            // Simpan ke broadcast_penerima dengan status gagal jika belum disimpan
            if ($customer && $customer->wa) {
                // Try to render message if we have the data
                $renderedMsg = $this->message;
                if ($order && isset($produk)) {
                    $customData = json_decode($order->custom_value, true) ?? [];
                    $templateData = array_merge([
                        'customer_name' => $customer->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : '',
                        'order_total'   => $order->total_harga ? number_format((float)$order->total_harga, 0, ',', '.') : '0',
                    ], $customData);
                    $renderedMsg = TemplateHelper::render($this->message, $templateData);
                }
                
                $this->saveBroadcastPenerima(
                    $customer->wa,
                    '0',
                    json_encode(['error' => $e->getMessage()]),
                    $renderedMsg
                );
            }
            
            throw $e;
        }
    }

    /**
     * Simpan hasil broadcast ke tabel broadcast_penerima
     */
    private function saveBroadcastPenerima(string $notelp, string $status, ?string $response = null, ?string $renderedMessage = null): void
    {
        try {
            // Gunakan rendered message jika ada, jika tidak gunakan original message
            $pesanToSave = $renderedMessage ?? $this->message;
            
            BroadcastPenerima::create([
                'broadcast' => $this->broadcastId,
                'user' => $this->userId,
                'customer' => $this->customerId,
                'notelp' => $notelp,
                'pesan' => $pesanToSave,
                'response' => $response,
                'status' => $status,
                'send_at' => now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Gagal menyimpan broadcast_penerima', [
                'broadcast_id' => $this->broadcastId,
                'customer_id' => $this->customerId,
                'notelp' => $notelp,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::channel('broadcast')->error('SendBroadcastJob gagal setelah semua retry', [
            'broadcast_id' => $this->broadcastId,
            'order_id' => $this->orderId,
            'customer_id' => $this->customerId,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);

        // Pastikan data tersimpan dengan status gagal jika belum ada
        try {
            $customer = Customer::find($this->customerId);
            if ($customer && $customer->wa) {
                // Cek apakah sudah ada record
                $existing = BroadcastPenerima::where('broadcast', $this->broadcastId)
                    ->where('notelp', $customer->wa)
                    ->first();

                if (!$existing) {
                    // Try to render message
                    $renderedMsg = $this->message;
                    try {
                        $order = OrderCustomer::with(['customer_rel', 'produk_rel'])->find($this->orderId);
                        if ($order && $order->produk_rel) {
                            $produk = $order->produk_rel;
                            $customData = json_decode($order->custom_value, true) ?? [];
                            $templateData = array_merge([
                                'customer_name' => $customer->nama ?? '',
                                'product_name'  => $produk->nama ?? '',
                                'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : '',
                                'order_total'   => $order->total_harga ? number_format((float)$order->total_harga, 0, ',', '.') : '0',
                            ], $customData);
                            $renderedMsg = TemplateHelper::render($this->message, $templateData);
                        }
                    } catch (\Exception $renderError) {
                        Log::channel('broadcast')->warning('Gagal render message di failed handler', [
                            'error' => $renderError->getMessage()
                        ]);
                    }
                    
                    $this->saveBroadcastPenerima(
                        $customer->wa,
                        '0',
                        json_encode(['error' => $exception->getMessage(), 'failed_after_retry' => true]),
                        $renderedMsg
                    );
                }
            }
        } catch (\Exception $e) {
            Log::channel('broadcast')->error('Gagal menyimpan broadcast_penerima di failed handler', [
                'broadcast_id' => $this->broadcastId,
                'error' => $e->getMessage()
            ]);
        }
    }
}

