<?php

namespace App\Services;

use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;

class MidtransServices
{
    public function __construct()
    {
        Config::$serverKey     = config('midtrans.server_key');
        Config::$isProduction  = config('midtrans.is_production');
        Config::$isSanitized   = config('midtrans.is_sanitized');
        Config::$is3ds         = config('midtrans.is_3ds');
    }


    public function createTransaction(array $params)
    {
        return Snap::getSnapToken($params);
    }


    public function getStatus(string $orderId)
    {
        return Transaction::status($orderId);
    }


    public function handleNotification(array $payload)
    {
        $notif = new \Midtrans\Notification();

        return [
            'order_id'       => $notif->order_id,
            'transaction_id' => $notif->transaction_id,
            'transaction_status' => $notif->transaction_status,
            'fraud_status'   => $notif->fraud_status,
            'payment_type'   => $notif->payment_type,
            'gross_amount'   => $notif->gross_amount,
            'status_code'    => $notif->status_code,
        ];
    }


    public function cancelTransaction(string $orderId)
    {
        return Transaction::cancel($orderId);
    }
}
