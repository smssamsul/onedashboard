<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderResi;
use Illuminate\Http\Request;

/**
 * Webhook publik dari Biteship (order.status, dll).
 * Set BITESHIP_WEBHOOK_SECRET dan kirim header X-One-Webhook-Token pada request webhook.
 *
 * @see https://biteship.com/en/docs/api/webhook/overview
 */
class BiteshipWebhookController extends Controller
{
    public function handle(Request $request)
    {
        \Log::info($request->all());
        $secret = env('BITESHIP_WEBHOOK_SECRET');
        if (is_string($secret) && $secret !== '') {
            $token = $request->header('X-One-Webhook-Token');
            if ($token !== $secret) {
                return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
            }
        }

        $payload = $request->all();
        $event = $payload['event'] ?? null;
        $biteshipOrderId = $payload['order_id'] ?? null;

        if (! $biteshipOrderId) {
            return response()->json(['success' => true, 'ignored' => true]);
        }

        $row = OrderResi::with('order')->where('biteship_order_id', $biteshipOrderId)->first();
        if (! $row) {
            return response()->json(['success' => true, 'message' => 'order_resi tidak ditemukan untuk order_id Biteship ini']);
        }

        $updates = [
            'meta' => array_merge($row->meta ?? [], [
                'last_webhook' => [
                    'event' => $event,
                    'payload' => $payload,
                    'received_at' => now()->toIso8601String(),
                ],
            ]),
        ];

        if (! empty($payload['courier_tracking_id'])) {
            $updates['tracking_id'] = $payload['courier_tracking_id'];
        }
        if (! empty($payload['courier_waybill_id'])) {
            $updates['waybill_id'] = $payload['courier_waybill_id'];
        }
        if (! empty($payload['status'])) {
            $updates['status'] = $payload['status'];
        }
        if (! empty($payload['courier_company'])) {
            $updates['courier_company'] = strtolower((string) $payload['courier_company']);
        }
        if (! empty($payload['courier_type'])) {
            $updates['courier_type'] = strtolower((string) $payload['courier_type']);
        }

        $row->update($updates);

        // Sync order status on associated OrderCustomer
        if (! empty($payload['status'])) {
            $biteshipStatus = strtolower((string) $payload['status']);
            $order = $row->order;

            if ($order) {
                $orderStatusUpdate = [];
                
                if ($biteshipStatus === 'delivered') {
                    $orderStatusUpdate['status_order'] = '4'; // Selesai / Completed
                } elseif (in_array($biteshipStatus, ['cancelled', 'rejected', 'returned', 'returned_to_sender'])) {
                    $orderStatusUpdate['status_order'] = '3'; // Canceled / Rejected
                } elseif (in_array($biteshipStatus, ['picking_up', 'picking_up_by_courier', 'picked', 'dropping_off'])) {
                    $orderStatusUpdate['status_order'] = '2'; // Processing / Diproses
                }

                if (! empty($orderStatusUpdate)) {
                    $orderStatusUpdate['update_at'] = now();
                    $order->update($orderStatusUpdate);
                    
                    \Log::info("Biteship Webhook - Order status synchronized", [
                        'order_id' => $order->id,
                        'biteship_order_id' => $biteshipOrderId,
                        'biteship_status' => $biteshipStatus,
                        'new_status_order' => $orderStatusUpdate['status_order']
                    ]);
                }
            }
        }

        return response()->json(['success' => true]);
    }
}
