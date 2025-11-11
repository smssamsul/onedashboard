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


    public function createSnapToken(Request $request)
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
                    'id' => 'donation-1',
                    'price' => $request->amount,
                    'quantity' => 1,
                    'name' => $request->product_name ?? 'Ternak Properti',
                ]
            ],
            'customer_details' => [
                'first_name' => $request->name,
                'email' => $request->email,
            ],
        ];

        $token = $this->midtrans->createTransaction($params);

        return response()->json([
            'success' => true,
            'snap_token' => $token,
            'order_id' => $orderId,
        ]);
    }

    /**
     * Endpoint untuk notifikasi dari Midtrans
     */
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
            'message' => 'Order updated successfully',
            'data' => $notif,
        ]);
    }
}
