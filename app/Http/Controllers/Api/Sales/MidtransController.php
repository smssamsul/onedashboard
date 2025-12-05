<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\MidtransServices;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Log;

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
        $orderId = 'ORDER-' . $baseOrderId;

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
        $orderId = 'ORDER-' . $baseOrderId;

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
        $orderId = 'ORDER-' . $baseOrderId;

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
        $orderId = 'ORDER-' . $baseOrderId;

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

        // Mapping order_id Midtrans ke ID di tabel order_customer
        $orderCustomerId = null;

        if ($orderIdRaw) {
            // Kalau langsung angka, pakai apa adanya
            if (is_numeric($orderIdRaw)) {
                $orderCustomerId = (int) $orderIdRaw;
            } elseif (is_string($orderIdRaw)) {
                // Support format seperti ORDER-123 atau ORDER_123
                if (preg_match('/(\d+)$/', $orderIdRaw, $matches)) {
                    $orderCustomerId = (int) $matches[1];
                }
            }
        }

        $order = null;
        if ($orderCustomerId) {
            $order = OrderCustomer::find($orderCustomerId);
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
                    'status_pembayaran' => '1', // pembayaran sukses
                    'waktu_pembayaran'  => $order->waktu_pembayaran ?? now(),
                    'update_at'         => now(),
                ]);

                Log::info('OrderCustomer payment success updated from Midtrans', [
                    'order_customer_id'  => $order->id,
                    'midtrans_order_id'  => $orderIdRaw,
                    'transaction_status' => $transactionStatus,
                    'fraud_status'       => $fraudStatus,
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
}
