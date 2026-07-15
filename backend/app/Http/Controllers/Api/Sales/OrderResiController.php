<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OrderCustomer;
use App\Models\OrderResi;
use App\Services\BiteshipService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class OrderResiController extends Controller
{
    private function currentSalesUser(): ?object
    {
        $login = auth('api')->user();
        if (! $login) {
            return null;
        }
        $login->loadMissing('userData');

        return $login->userData;
    }

    /**
     * Staff sales (divisi 3, level 2): hanya order customer milik sales tersebut.
     */
    private function applyOrderResiVisibility(\Illuminate\Database\Eloquent\Builder $query): void
    {
        $query->whereHas('order', function ($q) {
            $q->where('status', '!=', 'N');
        });
        $u = $this->currentSalesUser();
        if (! $u) {
            return;
        }
        $div = (string) ($u->divisi ?? '');
        $level = $u->level;
        if ($div === '3' && ($level === 2 || $level === '2')) {
            $query->whereHas('order.customer_rel', function ($q) use ($u) {
                $q->where('sales_id', $u->id)->where('status', '!=', 'N');
            });
        }
    }

    private function assertOrderVisibleToCurrentUser(OrderCustomer $order): ?\Illuminate\Http\JsonResponse
    {
        if ($order->status === 'N') {
            return response()->json(['success' => false, 'message' => 'Order tidak ditemukan'], 404);
        }
        $u = $this->currentSalesUser();
        if (! $u) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }
        $div = (string) ($u->divisi ?? '');
        $level = $u->level;
        if ($div === '3' && ($level === 2 || $level === '2')) {
            $order->loadMissing('customer_rel');
            $cust = $order->customer_rel;
            if (! $cust || (string) $cust->sales_id !== (string) $u->id || $cust->status === 'N') {
                return response()->json(['success' => false, 'message' => 'Order tidak ditemukan'], 404);
            }
        }

        return null;
    }

    private function extractPostalFromAlamat(?string $alamat): ?int
    {
        if (! $alamat) {
            return null;
        }
        if (preg_match('/(\d{5})\b/', $alamat, $m)) {
            return (int) $m[1];
        }

        return null;
    }

    /**
     * Default payload origin dari env (sama konsep dengan Next.js /api/biteship/orders).
     *
     * @return array<string, mixed>
     */
    private function biteshipOriginDefaults(): array
    {
        $postal = (int) env('BITESHIP_ORIGIN_POSTAL_CODE', 12440);

        return [
            'shipper_contact_name' => env('BITESHIP_SHIPPER_CONTACT_NAME', env('BITESHIP_ORIGIN_CONTACT_NAME', 'Shipper')),
            'shipper_contact_phone' => env('BITESHIP_SHIPPER_CONTACT_PHONE', env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890')),
            'shipper_organization' => env('BITESHIP_SHIPPER_ORGANIZATION', ''),
            'origin_contact_name' => env('BITESHIP_ORIGIN_CONTACT_NAME', 'Warehouse'),
            'origin_contact_phone' => env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890'),
            'origin_address' => env('BITESHIP_ORIGIN_ADDRESS', 'Jakarta'),
            'origin_postal_code' => $postal,
        ];
    }

    /**
     * GET /api/sales/order-resi — daftar pengiriman (paginasi, filter).
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->input('per_page', 20);
        $perPage = min(100, max(1, $perPage));

        $query = OrderResi::query()
            ->with([
                'order:id,kode_order,alamat,customer,produk,status',
                'order.customer_rel:id,nama,wa',
                'order.produk_rel:id,nama',
            ])
            ->orderBy('create_at', 'desc');

        $this->applyOrderResiVisibility($query);

        if ($request->filled('status')) {
            $query->where('status', 'like', '%' . $request->input('status') . '%');
        }

        if ($request->filled('q')) {
            $term = trim((string) $request->input('q'));
            $query->where(function ($q) use ($term) {
                $q->where('waybill_id', 'like', '%' . $term . '%')
                    ->orWhere('tracking_id', 'like', '%' . $term . '%')
                    ->orWhere('biteship_order_id', 'like', '%' . $term . '%')
                    ->orWhere('courier_company', 'like', '%' . $term . '%')
                    ->orWhereHas('order', function ($oq) use ($term) {
                        $oq->where('kode_order', 'like', '%' . $term . '%');
                        if (ctype_digit($term)) {
                            $oq->orWhere('id', (int) $term);
                        }
                    });
            });
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /**
     * GET /api/sales/order-resi/order/{orderId}
     */
    public function indexByOrder(int $orderId)
    {
        $order = OrderCustomer::find($orderId);
        if (! $order) {
            return response()->json(['success' => false, 'message' => 'Order tidak ditemukan'], 404);
        }
        if ($deny = $this->assertOrderVisibleToCurrentUser($order)) {
            return $deny;
        }

        $rows = OrderResi::where('order_id', $orderId)->orderBy('create_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    /**
     * GET /api/sales/order-resi/{id}
     */
    public function show(int $id)
    {
        $row = OrderResi::with('order')->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak ditemukan'], 404);
        }
        if (! $row->order) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak valid'], 404);
        }
        if ($deny = $this->assertOrderVisibleToCurrentUser($row->order)) {
            return $deny;
        }

        return response()->json(['success' => true, 'data' => $row]);
    }

    /**
     * POST /api/sales/order-resi
     * Buat order di Biteship + simpan ke order_resi.
     */
    public function store(Request $request)
    {
        $request->validate([
            'order_id' => 'required|integer|exists:order_customer,id',
            'courier_company' => 'required|string|max:64',
            'courier_type' => 'required|string|max:64',
            'delivery_type' => 'required|in:now,scheduled',
            'delivery_date' => 'nullable|date_format:Y-m-d',
            'delivery_time' => 'nullable|date_format:H:i',
            'destination_postal_code' => 'nullable|integer|min:1000|max:99999',
            // Field custom penerima & barang
            'destination_contact_name' => 'nullable|string|max:100',
            'destination_contact_phone' => 'nullable|string|max:30',
            'item_name' => 'nullable|string|max:100',
            // Opsi COD Ongkir
            'cod_ongkir' => 'nullable|boolean',
            'ongkir_cost' => 'nullable|integer|min:0',
        ]);

        $order = OrderCustomer::with(['customer_rel', 'produk_rel'])->findOrFail($request->order_id);
        if ($deny = $this->assertOrderVisibleToCurrentUser($order)) {
            return $deny;
        }
        $customer = $order->customer_rel;

        $destPostal = $request->input('destination_postal_code');
        if ($destPostal === null) {
            $destPostal = $this->extractPostalFromAlamat($order->alamat);
        }
        if (! $destPostal) {
            return response()->json([
                'success' => false,
                'message' => 'Kode pos tujuan tidak ditemukan. Isi destination_postal_code atau pastikan alamat memuat 5 digit kode pos.',
            ], 422);
        }

        $phone = $customer?->wa ? preg_replace('/\D+/', '', (string) $customer->wa) : '';
        if (strlen($phone) < 10) {
            $phone = '081234567890';
        }

        $itemValue = max(1000, (int) round((float) ($order->harga ?? 0)));

        $reference = 'one-od-' . $order->id . '-' . bin2hex(random_bytes(4));

        // Nama & telpon penerima: dari request jika diisi, fallback ke data customer
        $destContactName  = $request->filled('destination_contact_name')
            ? $request->input('destination_contact_name')
            : ($customer?->nama ?? 'Penerima');
        $destContactPhone = $request->filled('destination_contact_phone')
            ? preg_replace('/\D+/', '', (string) $request->input('destination_contact_phone'))
            : $phone;
        if (strlen($destContactPhone) < 10) {
            $destContactPhone = $phone;
        }

        // Nama / jenis barang: dari request jika diisi, fallback ke nama produk
        $itemName = $request->filled('item_name')
            ? $request->input('item_name')
            : ($order->produk_rel?->nama ?? 'Paket');

        $payload = array_merge($this->biteshipOriginDefaults(), [
            'destination_contact_name' => $destContactName,
            'destination_contact_phone' => $destContactPhone,
            'destination_address' => $request->input('destination_address') ?: ($order->alamat ?: '-'),
            'destination_postal_code' => (int) $destPostal,
            'courier_company' => strtolower($request->courier_company),
            'courier_type' => strtolower($request->courier_type),
            'delivery_type' => $request->delivery_type,
            'reference_id' => $reference,
            'items' => [
                [
                    'name' => $itemName,
                    'value' => $itemValue,
                    'quantity' => 1,
                    'weight' => (int) $request->input('weight_grams', 1000),
                    'category' => 'others',
                ],
            ],
        ]);

        if ($request->delivery_type === 'scheduled') {
            if (! $request->delivery_date || ! $request->delivery_time) {
                return response()->json([
                    'success' => false,
                    'message' => 'Untuk scheduled, delivery_date (Y-m-d) dan delivery_time (H:i) wajib.',
                ], 422);
            }
            $payload['delivery_date'] = $request->delivery_date;
            $payload['delivery_time'] = $request->delivery_time;
        }

        if (filter_var($request->input('cod_ongkir'), FILTER_VALIDATE_BOOLEAN)) {
            $payload['destination_cash_on_delivery_amount'] = (int) $request->input('ongkir_cost', 0);
            $payload['destination_cash_on_delivery_type'] = '7_days';
        }

        try {
            $data = BiteshipService::createOrder($payload);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }

        // --- CEK DEMO MODE ---
        if ($request->input('demo_mode')) {
            return response()->json([
                'success' => true,
                'message' => '[SIMULASI] Order pengiriman berhasil dibuat di sistem Biteship (Test), tapi TIDAK disimpan ke database.',
                'data' => [
                    'order_resi' => null,
                    'biteship' => $data,
                ],
            ]);
        }

        $scheduledAt = null;
        if ($request->delivery_type === 'scheduled' && $request->delivery_date && $request->delivery_time) {
            try {
                $scheduledAt = Carbon::parse($request->delivery_date . ' ' . $request->delivery_time);
            } catch (\Throwable) {
                $scheduledAt = null;
            }
        }

        $courier = is_array($data['courier'] ?? null) ? $data['courier'] : [];

        $row = OrderResi::create([
            'order_id' => $order->id,
            'biteship_order_id' => $data['id'] ?? null,
            'tracking_id' => $courier['tracking_id'] ?? null,
            'waybill_id' => $courier['waybill_id'] ?? null,
            'courier_company' => $request->courier_company,
            'courier_type' => $request->courier_type,
            'delivery_type' => $request->delivery_type,
            'scheduled_at' => $scheduledAt,
            'status' => $data['status'] ?? null,
            'meta' => [
                'create_response' => $data,
                'cod_ongkir' => filter_var($request->input('cod_ongkir'), FILTER_VALIDATE_BOOLEAN),
                'ongkir_cost' => (int) $request->input('ongkir_cost', 0)
            ],
        ]);

        if (filter_var($request->input('cod_ongkir'), FILTER_VALIDATE_BOOLEAN)) {
            $order->ongkir = (string) $request->input('ongkir_cost', 0);
            $order->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Order pengiriman Biteship berhasil dibuat',
            'data' => [
                'order_resi' => $row,
                'biteship' => $data,
            ],
        ]);
    }

    /**
     * POST /api/sales/order-resi/{id}/sync
     * Tarik status terbaru dari Biteship (tracking API) lalu update DB.
     */
    public function sync(int $id)
    {
        $row = OrderResi::with('order')->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak ditemukan'], 404);
        }
        if (! $row->order) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak valid'], 404);
        }
        if ($deny = $this->assertOrderVisibleToCurrentUser($row->order)) {
            return $deny;
        }

        $trackingId = $row->tracking_id;
        if (! $trackingId && $row->biteship_order_id) {
            try {
                $orderJson = BiteshipService::getOrder($row->biteship_order_id);
                $courier = is_array($orderJson['courier'] ?? null) ? $orderJson['courier'] : [];
                $trackingId = $courier['tracking_id'] ?? null;
                if ($trackingId) {
                    $row->tracking_id = $trackingId;
                    $row->waybill_id = $row->waybill_id ?: ($courier['waybill_id'] ?? null);
                    $row->status = $orderJson['status'] ?? $row->status;
                    $row->meta = array_merge($row->meta ?? [], ['last_order_fetch' => $orderJson]);
                    $row->save();
                }
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
            }
        }

        if (! $row->tracking_id) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada tracking_id; cek biteship_order_id atau buat ulang order.',
            ], 422);
        }

        try {
            $track = BiteshipService::getTracking($row->tracking_id);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        $status = $track['status'] ?? $row->status;
        $waybill = $track['waybill_id'] ?? $row->waybill_id;

        $row->status = is_string($status) ? $status : $row->status;
        $row->waybill_id = $waybill ?: $row->waybill_id;
        $row->meta = array_merge($row->meta ?? [], ['last_tracking' => $track]);
        $row->save();

        return response()->json([
            'success' => true,
            'message' => 'Status diperbarui dari Biteship',
            'data' => [
                'order_resi' => $row->fresh(),
                'tracking' => $track,
            ],
        ]);
    }

    /**
     * GET /api/sales/order-resi/{id}/label
     * Ambil URL label/resi PDF dari Biteship.
     */
    public function label(int $id)
    {
        $row = OrderResi::with('order')->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak ditemukan'], 404);
        }
        if (! $row->order) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak valid'], 404);
        }
        if ($deny = $this->assertOrderVisibleToCurrentUser($row->order)) {
            return $deny;
        }

        if (! $row->biteship_order_id) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada biteship_order_id; buat ulang order pengiriman.',
            ], 422);
        }

        try {
            $data = BiteshipService::getLabel($row->biteship_order_id);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * GET /api/sales/order-resi/{id}/tracking
     * Ambil detail tracking timeline dari Biteship.
     */
    public function trackingDetail(int $id)
    {
        $row = OrderResi::with('order')->find($id);
        if (! $row) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak ditemukan'], 404);
        }
        if (! $row->order) {
            return response()->json(['success' => false, 'message' => 'Data resi tidak valid'], 404);
        }
        if ($deny = $this->assertOrderVisibleToCurrentUser($row->order)) {
            return $deny;
        }

        $trackingId = $row->tracking_id;

        // Jika belum ada tracking_id, coba ambil dari Biteship order
        if (! $trackingId && $row->biteship_order_id) {
            try {
                $orderJson = BiteshipService::getOrder($row->biteship_order_id);
                $courier = is_array($orderJson['courier'] ?? null) ? $orderJson['courier'] : [];
                $trackingId = $courier['tracking_id'] ?? null;
                if ($trackingId) {
                    $row->tracking_id = $trackingId;
                    $row->waybill_id  = $row->waybill_id ?: ($courier['waybill_id'] ?? null);
                    $row->save();
                }
            } catch (\Throwable $e) {
                return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
            }
        }

        if (! $trackingId) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada tracking_id; lakukan Refresh dulu atau buat ulang order.',
            ], 422);
        }

        try {
            $track = BiteshipService::getTracking($trackingId);
        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 502);
        }

        return response()->json([
            'success' => true,
            'data' => $track,
        ]);
    }

    /**
     * GET /api/sales/order-resi/print-custom-label
     * Cetak resi pengiriman kustom (PDF ukuran label)
     */
    public function printCustomLabel(Request $request)
    {
        $contact_name = $request->input('contact_name', '-');
        $contact_phone = $request->input('contact_phone', '-');
        $address = $request->input('address', '-');

        if ($request->filled('resi_id')) {
            $resi = \App\Models\OrderResi::find($request->input('resi_id'));
            if ($resi) {
                $meta = is_string($resi->meta) ? json_decode($resi->meta, true) : $resi->meta;
                
                // 1. Nama penerima murni dari destination->contact_name
                $biteshipName = $meta['create_response']['destination']['contact_name'] ?? 
                                $meta['last_order_fetch']['destination']['contact_name'] ?? 
                                $meta['last_tracking']['destination']['contact_name'] ?? null;
                if ($biteshipName) {
                    $contact_name = $biteshipName;
                }
                
                // 2. Alamat penerima murni dari destination->address
                $biteshipAddress = $meta['create_response']['destination']['address'] ?? 
                                   $meta['last_order_fetch']['destination']['address'] ?? 
                                   $meta['last_tracking']['destination']['address'] ?? null;
                if ($biteshipAddress) {
                    $address = $biteshipAddress;
                }
            }
        }

        $data = [
            'waybill_id'       => $request->input('waybill_id', '-'),
            'contact_name'     => $contact_name,
            'contact_phone'    => $contact_phone,
            'address'          => $address,
            'routing_code'     => $request->input('routing_code', '-'),
            // company digunakan blade untuk load logo kurir dari public/images/courier/{company}.png
            'company'          => $request->input('company', ''),
            'type'             => $request->input('type', '-'),
            'ongkos_kirim'     => $request->input('ongkos_kirim', '0'),
            'reference_number' => $request->input('reference_number', '-'),
            'quantity'         => $request->input('quantity', '1 Pcs'),
            'weight'           => $request->input('weight', '1 Kg'),
            'sender_name'      => $request->input('sender_name', 'Ternak Properti'),
            'sender_phone'     => $request->input('sender_phone', '-'),
            'sender_address'   => $request->input('sender_address', '-'),
            'jenis_barang'     => $request->input('jenis_barang', '-'),
            'catatan'          => $request->input('catatan', 'Tidak Ada'),
        ];

        try {
            $generator = new \Picqer\Barcode\BarcodeGeneratorPNG();
            $data['barcodeMain'] = $data['waybill_id'] !== '-' ? base64_encode($generator->getBarcode($data['waybill_id'], $generator::TYPE_CODE_128)) : '';
            $data['barcodeRef'] = $data['reference_number'] !== '-' ? base64_encode($generator->getBarcode($data['reference_number'], $generator::TYPE_CODE_128)) : '';
        } catch (\Exception $e) {
            $data['barcodeMain'] = '';
            $data['barcodeRef'] = '';
        }

        // 4x6 inches in points (72 points per inch) = 288x432
        $pdf = Pdf::loadView('pdf.label', $data)->setPaper(array(0, 0, 288, 432), 'portrait');

        return $pdf->download('resi-' . $data['waybill_id'] . '.pdf');
    }
}
