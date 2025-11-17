<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\MidtransServices;
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
        ]);

        $orderId = 'ORDER-' . time();

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
        ]);

        $orderId = 'ORDER-' . time();

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
        ]);

        $orderId = 'ORDER-' . time();

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
        ]);

        $orderId = 'ORDER-' . time();

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
        Log::info('Midtrans Notification: ', $request->all());

        $notif = $this->midtrans->handleNotification($request->all());
         // $order = Order::where('order_id', $notif['order_id'])->first();

        // if ($order) {
        //     $order->update([
        //         'transaction_id' => $notif['transaction_id'],
        //         'payment_type' => $notif['payment_type'],
        //         'transaction_status' => $notif['transaction_status'],
        //         'fraud_status' => $notif['fraud_status'],
        //     ]);
        // }

        return response()->json([
            'success' => true,
            'message' => 'Notification processed',
            'data' => $notif,
        ]);
    }
}
