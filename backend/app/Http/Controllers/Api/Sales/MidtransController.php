<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\MidtransServices;
use App\Models\OrderCustomer;
use App\Models\OrderPayment;
use App\Models\Produk;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\Sales;
use App\Models\TemplateFollup;
use App\Helpers\TemplateHelper;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class MidtransController extends Controller
{
    protected $midtrans;

    public function __construct(MidtransServices $midtrans)
    {
        $this->midtrans = $midtrans;
    }

    public function createSnapTokenGeneral(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'name' => 'required|string',
            'email' => 'required|email',
            // optional: id order_customer agar bisa dihubungkan ke webhook
            'order_id' => 'nullable|integer',
        ]);

        // Kalau ada order_id dari tabel order_customer, pakai itu.
        // Kalau tidak ada, fallback ke time() seperti sebelumnya.
        $baseOrderId = $request->order_id ?? time();
        $timestamp = time();
        $orderId = 'ORDER-' . $baseOrderId . '-' . $timestamp;

        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $request->amount,
            ],
            'item_details' => [
                [
                    'id' => 'product-1',
                    'price' => $request->amount,
                    'quantity' => 1,
                    'name' => $request->product_name ?? 'Produk Pembayaran',
                ]
            ],
            // 'enabled_payments' => ['credit_card'],  
            'credit_card' => [
                'secure' => true
            ],
            'customer_details' => [
                'first_name' => $request->name,
                'email' => $request->email,
            ],
        ];

        // Create transaction (token + redirect_url)
        $transaction = $this->midtrans->createTransaction($params);

        return response()->json([
            'success' => true,
            'snap_token' => $transaction['token'],
            'redirect_url' => $transaction['redirect_url'],
            'order_id' => $orderId,
        ]);
    }

    public function createSnapTokenCC(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'name' => 'required|string',
            'email' => 'required|email',
            'order_id' => 'nullable|integer',
        ]);

        $baseOrderId = $request->order_id ?? time();
        $timestamp = time();
        $orderId = 'ORDER-' . $baseOrderId . '-' . $timestamp;

        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $request->amount,
            ],
            'item_details' => [
                [
                    'id' => 'product-1',
                    'price' => $request->amount,
                    'quantity' => 1,
                    'name' => $request->product_name ?? 'Produk Pembayaran',
                ]
            ],
            'enabled_payments' => [
                'credit_card'
            
            ],  
            'credit_card' => [
                'secure' => true
            ],
            'customer_details' => [
                'first_name' => $request->name,
                'email' => $request->email,
            ],
        ];

        // Create transaction (token + redirect_url)
        $transaction = $this->midtrans->createTransaction($params);

        return response()->json([
            'success' => true,
            'snap_token' => $transaction['token'],
            'redirect_url' => $transaction['redirect_url'],
            'order_id' => $orderId,
        ]);
    }


    public function createSnapTokenEwallet(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'name' => 'required|string',
            'email' => 'required|email',
            'order_id' => 'nullable|integer',
        ]);

        $baseOrderId = $request->order_id ?? time();
        $timestamp = time();
        $orderId = 'ORDER-' . $baseOrderId . '-' . $timestamp;

        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $request->amount,
            ],
            'item_details' => [
                [
                    'id' => 'product-1',
                    'price' => $request->amount,
                    'quantity' => 1,
                    'name' => $request->product_name ?? 'Produk Pembayaran',
                ]
            ],
            'enabled_payments' => [
                'gopay',
                'shopeepay',
                'ovo',
                'qris'
            
            ],  
            'credit_card' => [
                'secure' => true
            ],
            'customer_details' => [
                'first_name' => $request->name,
                'email' => $request->email,
            ],
        ];

        // Create transaction (token + redirect_url)
        $transaction = $this->midtrans->createTransaction($params);

        return response()->json([
            'success' => true,
            'snap_token' => $transaction['token'],
            'redirect_url' => $transaction['redirect_url'],
            'order_id' => $orderId,
        ]);
    }

    public function createSnapTokenVA(Request $request)
    {
        $request->validate([
            'amount' => 'required|numeric|min:1000',
            'name' => 'required|string',
            'email' => 'required|email',
            'order_id' => 'nullable|integer',
        ]);

        $baseOrderId = $request->order_id ?? time();
        $timestamp = time();
        $orderId = 'ORDER-' . $baseOrderId . '-' . $timestamp;

        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $request->amount,
            ],
            'item_details' => [
                [
                    'id' => 'product-1',
                    'price' => $request->amount,
                    'quantity' => 1,
                    'name' => $request->product_name ?? 'Produk Pembayaran',
                ]
            ],
            'enabled_payments' => [
                'bca_va',
                'bri_va',
                'bni_va',
                'permata_va',
                'echannel',
                'other_va',
            
            ],  
            'credit_card' => [
                'secure' => true
            ],
            'customer_details' => [
                'first_name' => $request->name,
                'email' => $request->email,
            ],
        ];

        // Create transaction (token + redirect_url)
        $transaction = $this->midtrans->createTransaction($params);

        return response()->json([
            'success' => true,
            'snap_token' => $transaction['token'],
            'redirect_url' => $transaction['redirect_url'],
            'order_id' => $orderId,
        ]);
    }





    public function notificationHandler(Request $request)
    {
        Log::info('Midtrans Notification received', $request->all());

        // Ambil data notifikasi ter-parsing dari service
        $notif = $this->midtrans->handleNotification($request->all());

        $orderIdRaw          = $notif['order_id'] ?? null;
        $transactionStatus   = $notif['transaction_status'] ?? null;
        $fraudStatus         = $notif['fraud_status'] ?? null;
        $grossAmount         = $notif['gross_amount'] ?? null;
        $paymentType         = $notif['payment_type'] ?? null;
        $vaNumbers           = $notif['va_numbers'] ?? [];
        $settlementTime      = $notif['settlement_time'] ?? null;
        $transactionTime     = $notif['transaction_time'] ?? null;

        // Mapping order_id Midtrans ke ID di tabel order_customer
        $orderCustomerId = null;

        if ($orderIdRaw) {
            // Kalau langsung angka, pakai apa adanya
            if (is_numeric($orderIdRaw)) {
                $orderCustomerId = (int) $orderIdRaw;
            } elseif (is_string($orderIdRaw)) {
                // Support format ORDER-{id}-{timestamp} atau ORDER-{id} atau ORDER_{id}
                // Ambil ID pertama setelah ORDER- (sebelum timestamp atau akhir string)
                if (preg_match('/ORDER-(\d+)(?:-|\d+|$)/', $orderIdRaw, $matches)) {
                    $orderCustomerId = (int) $matches[1];
                }
            }
        }

        $order = null;
        if ($orderCustomerId) {
            // Ambil order beserta relasi produk, customer, dan bundling
            $order = OrderCustomer::with(['customer_rel', 'produk_rel', 'bundling_rel'])->find($orderCustomerId);
        }

        if ($order) {
            // Tentukan apakah transaksi dianggap sukses
            $isSuccess = false;

            if ($transactionStatus === 'capture') {
                // Untuk kartu kredit, pastikan fraud_status = accept
                $isSuccess = ($fraudStatus === 'accept');
            } elseif ($transactionStatus === 'settlement') {
                // Untuk bank transfer / ewallet, settlement = sukses
                $isSuccess = true;
            }

            if ($isSuccess) {
                $order->update([
                    'status_order'      => '2', // sudah dibayar
                    'status_pembayaran' => '2', // pembayaran sukses
                    'waktu_pembayaran'  => $order->waktu_pembayaran ?? now(),
                    'update_at'         => now(),
                ]);

                // Auto-promote: lead → customer saat pembayaran Midtrans berhasil (settlement)
                if ($order->customer_rel && $order->customer_rel->customer_type === 'lead') {
                    $order->customer_rel->update(['customer_type' => 'customer']);

                    // Update semua lead aktif terkait → CONVERTED
                    \App\Models\Lead::where('customer_id', $order->customer_rel->id)
                        ->where('status', '!=', 'N')
                        ->whereNotIn('status', ['CONVERTED', 'LOST'])
                        ->update(['status' => 'CONVERTED', 'update_at' => now()]);

                    Log::info('Midtrans notification - Lead dipromote ke customer', [
                        'order_customer_id' => $order->id,
                        'customer_id'       => $order->customer_rel->id,
                    ]);
                }

                // Auto-dispatch Biteship shipping untuk produk fisik
                if (env('BITESHIP_AUTO_SHIPPING_ENABLED', true)) {
                    try {
                        $autoShipping = app(\App\Services\AutoBiteshipShippingService::class)->dispatchIfPhysical($order);
                        Log::info('Midtrans notification - Auto Biteship shipping', [
                            'order_customer_id'     => $order->id,
                            'auto_shipping_success' => $autoShipping['success'],
                            'auto_shipping_message' => $autoShipping['message'],
                            'resi_id'               => $autoShipping['resi']?->id,
                        ]);
                    } catch (\Throwable $e) {
                        Log::error('Midtrans notification - Auto Biteship shipping gagal', [
                            'order_customer_id' => $order->id,
                            'error'             => $e->getMessage(),
                        ]);
                    }
                }

                // Hitung payment_ke berdasarkan jumlah payment yang sudah ada
                $paymentCount = OrderPayment::where('order_id', $order->id)->count();
                $paymentKe = $paymentCount + 1;

                // Tentukan payment_method dari va_numbers atau payment_type
                $paymentMethod = $paymentType;
                if (!empty($vaNumbers) && is_array($vaNumbers)) {
                    $firstVa = $vaNumbers[0];
                    if (isset($firstVa['bank'])) {
                        $paymentMethod = strtoupper($firstVa['bank']) . ' VA';
                    }
                }

                // Tentukan tanggal dari settlement_time atau transaction_time
                $tanggalPembayaran = null;
                if ($settlementTime) {
                    try {
                        $tanggalPembayaran = \Carbon\Carbon::parse($settlementTime)->format('Y-m-d');
                    } catch (\Exception $e) {
                        $tanggalPembayaran = null;
                    }
                }
                if (!$tanggalPembayaran && $transactionTime) {
                    try {
                        $tanggalPembayaran = \Carbon\Carbon::parse($transactionTime)->format('Y-m-d');
                    } catch (\Exception $e) {
                        $tanggalPembayaran = null;
                    }
                }
                if (!$tanggalPembayaran) {
                    $tanggalPembayaran = now()->format('Y-m-d');
                }

                // Create OrderPayment baru
                $payment = OrderPayment::create([
                    'order_id' => $order->id,
                    'amount' => $grossAmount ?? $order->total_harga,
                    'payment_ke' => $paymentKe,
                    'payment_method' => $paymentMethod,
                    'payment_type' => $paymentType,
                    'tanggal' => $tanggalPembayaran,
                    'status' => '2', // pembayaran sukses
                    'catatan' => 'Pembayaran otomatis dari Midtrans - ' . ($transactionStatus ?? 'settlement'),
                ]);

                // === Update keanggotaan customer untuk produk kategori workshop (6) ===
                if ($order->produk_rel && $order->customer_rel) {
                    $produk = $order->produk_rel;

                    // Cek jika kategori produk adalah 6 (workshop)
                    if ($produk->kategori == 6 || $produk->kategori == '6') {
                        // Ambil nama bundling dari order (relasi produk_bundling)
                        if ($order->bundling_rel && $order->bundling_rel->nama) {
                            $namaBundling = $order->bundling_rel->nama;

                            // Update keanggotaan customer dengan nama bundling
                            $order->customer_rel->update([
                                'keanggotaan' => $namaBundling,
                            ]);

                            Log::info('Midtrans notification - Update keanggotaan customer', [
                                'order_customer_id' => $order->id,
                                'customer_id'       => $order->customer_rel->id,
                                'kategori_produk'   => $produk->kategori,
                                'nama_bundling'     => $namaBundling,
                            ]);
                        } else {
                            Log::warning('Midtrans notification - Bundling tidak ditemukan untuk order workshop', [
                                'order_customer_id' => $order->id,
                                'produk_id'         => $produk->id,
                                'kategori_produk'   => $produk->kategori,
                                'order_bundling_id' => $order->bundling,
                            ]);
                        }
                    }
                }

                // Kirim notifikasi WhatsApp ke customer (sama seperti approve di finance)
                try {
                    if ($order && $order->customer_rel && $order->customer_rel->wa) {
                        $customer = $order->customer_rel;
                        $produk = $order->produk_rel;

                        // Cari template followup untuk pembayaran berhasil (type 7)
                        $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                            ->where('type', '7')
                            ->first();

                        // Jika tidak ada template, gunakan pesan default
                        if ($templateFollup) {
                            $dataText = [
                                'customer_name' => $customer->nama ?? '',
                                'product_name'  => $produk->nama ?? '',
                                'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                                'order_total'   => number_format($order->total_harga ?? 0, 0, ',', '.'),
                                'payment_amount' => number_format($payment->amount ?? 0, 0, ',', '.'),
                                'payment_method' => $payment->payment_method ?? '',
                                'payment_ke'    => $payment->payment_ke ?? 1,
                            ];

                            $message = TemplateHelper::render($templateFollup->text, $dataText);
                        } else {
                            // Pesan default
                            $message = "Halo {$customer->nama},\n\nTerima kasih! Pembayaran Anda sebesar Rp " . number_format($payment->amount, 0, ',', '.') . " untuk produk {$produk->nama} telah berhasil diverifikasi dan disetujui.\n\nTerima kasih atas kepercayaan Anda 🙏";
                        }

                        // Ambil woowa_key dari sales yang terkait dengan customer
                        $woowaKey = $this->getWoowaKeyFromSales($customer);

                        Log::info('Midtrans notification - Mengirim WhatsApp', [
                            'order_customer_id' => $order->id,
                            'payment_id' => $payment->id,
                            'customer_id' => $customer->id,
                            'customer_wa' => $customer->wa,
                            'woowa_key_found' => $woowaKey ? true : false,
                        ]);

                        if ($woowaKey) {
                            $waSender = app(\App\Services\WhatsAppSenderService::class);
                            $response = $waSender->sendMessage($customer->wa, $message, null, $woowaKey);

                            Log::info('Midtrans notification - Response WhatsApp', [
                                'order_customer_id' => $order->id,
                                'payment_id' => $payment->id,
                                'http_status' => $response->status(),
                                'successful' => $response->successful(),
                                'response' => $response->json(),
                            ]);

                            if (!$response->successful()) {
                                Log::warning('Midtrans notification - WhatsApp gagal dikirim', [
                                    'order_customer_id' => $order->id,
                                    'payment_id' => $payment->id,
                                    'http_status' => $response->status(),
                                    'response' => $response->json(),
                                ]);
                            }
                        } else {
                            Log::warning('Midtrans notification - Woowa Key tidak ditemukan', [
                                'order_customer_id' => $order->id,
                                'payment_id' => $payment->id,
                                'customer_id' => $customer->id,
                                'customer_sales_id' => $customer->sales_id,
                            ]);
                        }
                    } else {
                        Log::warning('Midtrans notification - Customer tidak memiliki nomor WA', [
                            'order_customer_id' => $order->id,
                            'payment_id' => $payment->id,
                            'customer_id' => $order ? $order->customer : null,
                        ]);
                    }
                } catch (\Exception $e) {
                    Log::error('Midtrans notification - Exception saat kirim WhatsApp', [
                        'order_customer_id' => $order->id,
                        'payment_id' => $payment->id ?? null,
                        'error_message' => $e->getMessage(),
                        'error_file' => $e->getFile(),
                        'error_line' => $e->getLine(),
                    ]);
                }

                // ✅ Facebook Pixel: Purchase event tracking
                // Catatan: Karena ini server-side webhook, Purchase event perlu di-track menggunakan:
                // 1. Facebook Conversions API (server-side tracking) - Recommended
                // 2. Atau simpan flag di database dan trigger di frontend ketika customer buka halaman order
                // Untuk implementasi Conversions API, gunakan Facebook Business SDK atau HTTP API
                // Contoh: POST ke https://graph.facebook.com/v18.0/{pixel_id}/events
                // dengan access_token dan event data (event_name: 'Purchase', event_time, user_data, custom_data)
                
                Log::info('OrderCustomer payment success updated from Midtrans', [
                    'order_customer_id'  => $order->id,
                    'midtrans_order_id'  => $orderIdRaw,
                    'transaction_status' => $transactionStatus,
                    'fraud_status'       => $fraudStatus,
                    'payment_created'    => true,
                    'fb_pixel_purchase'  => 'Needs Conversions API implementation',
                    'product_name'        => $order->produk_rel->nama ?? null,
                    'order_value'        => $grossAmount ?? $order->total_harga ?? null,
                ]);
            } else {
                Log::info('Midtrans notification not marked as success, order not updated', [
                    'order_customer_id'  => $order->id,
                    'midtrans_order_id'  => $orderIdRaw,
                    'transaction_status' => $transactionStatus,
                    'fraud_status'       => $fraudStatus,
                ]);
            }
        } else {
            Log::warning('OrderCustomer not found for Midtrans notification', [
                'midtrans_order_id' => $orderIdRaw,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification processed',
            'data' => $notif,
        ]);
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     * Jika tidak ditemukan, fallback ke SalesSetting::getWoowaUtama()
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return \App\Models\SalesSetting::getWoowaUtama();
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();
        
        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        // Fallback jika tidak ditemukan
        return \App\Models\SalesSetting::getWoowaUtama();
    }
}
