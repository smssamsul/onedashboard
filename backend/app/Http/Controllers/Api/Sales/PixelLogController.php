<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PixelCheckLog;

class PixelLogController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'order_id'   => 'nullable|integer|exists:order_customer,id',
            'produk_id'  => 'nullable|integer|exists:produk,id',
            'pixel_id'   => 'nullable|string',
            'event_name' => 'nullable|string',
            'source'     => 'nullable|string',
            'status'     => 'nullable|string',
            'payload'    => 'nullable|array',
        ]);

        $log = PixelCheckLog::create([
            'order_id'   => $request->order_id,
            'produk_id'  => $request->produk_id,
            'pixel_id'   => $request->pixel_id,
            'event_name' => $request->event_name,
            'source'     => $request->source ?? 'payment_page',
            'status'     => $request->status ?? '1',
            'payload'    => $request->payload,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'create_at'  => now(),
            'update_at'  => now(),
        ]);

        // Cek apakah pixel ID memiliki token CAPI di tabel pixel_meta
        if ($request->pixel_id) {
            $pixelMeta = \App\Models\PixelMeta::where('pixel', $request->pixel_id)->first();
            
            if ($pixelMeta && $pixelMeta->conversion_api_token) {
                $eventData = [
                    'event_name' => $request->event_name ?? 'PageView',
                    'event_time' => time(),
                    'action_source' => 'website',
                    'user_data' => [
                        'client_ip_address' => $request->ip(),
                        'client_user_agent' => $request->userAgent(),
                    ]
                ];
                
                // Ambil custom data dari payload (misal: value, currency, content_name)
                if (is_array($request->payload) && !empty($request->payload)) {
                    $paramsSource = isset($request->payload['params']) && is_array($request->payload['params']) 
                                    ? $request->payload['params'] 
                                    : $request->payload;

                    $customData = [];
                    foreach (['value', 'currency', 'content_name', 'content_category'] as $key) {
                        if (isset($paramsSource[$key])) {
                            $customData[$key] = $paramsSource[$key];
                        }
                    }
                    if (!empty($customData)) {
                        $eventData['custom_data'] = $customData;
                    }

                    // Ambil fbc atau fbp jika disertakan dari frontend
                    if (isset($paramsSource['fbp'])) {
                        $eventData['user_data']['fbp'] = $paramsSource['fbp'];
                    }
                    if (isset($paramsSource['fbc'])) {
                        $eventData['user_data']['fbc'] = $paramsSource['fbc'];
                    }
                }

                $postData = [
                    'data' => [$eventData],
                ];
                
                // Tambahkan kode testing jika ada
                if ($pixelMeta->kode_testing) {
                    $postData['test_event_code'] = $pixelMeta->kode_testing;
                }

                $url = "https://graph.facebook.com/v18.0/{$request->pixel_id}/events?access_token=" . $pixelMeta->conversion_api_token;

                try {
                    // Timeout 3 detik agar tidak membebani server/menghambat response
                    \Illuminate\Support\Facades\Log::info('FB CAPI Request Payload: ' . json_encode($postData));
                    
                    $response = \Illuminate\Support\Facades\Http::timeout(3)->post($url, $postData);
                    
                    \Illuminate\Support\Facades\Log::info('FB CAPI Response: ' . $response->body());
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('FB CAPI Error (' . $request->event_name . '): ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Pixel log created successfully',
            'data'    => $log
        ]);
    }

    public function index(Request $request)
    {
        $query = PixelCheckLog::with(['order.customer_rel', 'produk'])->orderBy('create_at', 'desc');

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('pixel_id', 'ILIKE', "%{$search}%")
                  ->orWhere('event_name', 'ILIKE', "%{$search}%")
                  ->orWhereHas('order', function($qOrder) use ($search) {
                      $qOrder->where('customer', 'ILIKE', "%{$search}%")
                             ->orWhere('kode_order', 'ILIKE', "%{$search}%");
                  })
                  ->orWhereHas('produk', function($qProduk) use ($search) {
                      $qProduk->where('nama', 'ILIKE', "%{$search}%");
                  });
            });
        }

        if ($request->has('event_name') && $request->event_name != '') {
            $query->where('event_name', $request->event_name);
        }

        if ($request->has('start_date') && $request->start_date != '') {
            $query->whereDate('create_at', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date != '') {
            $query->whereDate('create_at', '<=', $request->end_date);
        }

        $perPage = $request->get('per_page', 15);
        $logs = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data'    => $logs->items(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page'    => $logs->lastPage(),
                'per_page'     => $logs->perPage(),
                'total'        => $logs->total(),
            ]
        ]);
    }
}
