<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Broadcast;
use App\Models\BroadcastPenerima;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\Produk;
use App\Jobs\SendBroadcastJob;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class BroadcastController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }


    public function index(Request $request)
    {
        $query = Broadcast::query()->orderBy('create_at', 'desc');

        // Jika tidak ada request page dan per_page, tampilkan semua data
        if (!$request->has('page') && !$request->has('per_page')) {
            $broadcasts = $query->get();
            
            return response()->json([
                'success' => true,
                'message' => 'Data broadcast berhasil diambil',
                'data' => $broadcasts,
            ]);
        }

        // Jika ada page atau per_page, gunakan pagination
        $perPage = $request->get('per_page', 15);
        $broadcasts = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data broadcast berhasil diambil',
            'data' => $broadcasts->items(),
            'pagination' => [
                'current_page' => $broadcasts->currentPage(),
                'last_page' => $broadcasts->lastPage(),
                'per_page' => $broadcasts->perPage(),
                'total' => $broadcasts->total(),
            ],
        ]);
    }


    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string|max:255',
            'pesan' => 'required|string',
            'tanggal_kirim' => 'nullable|date',
            'target' => 'required|array',
            'target.produk' => 'nullable',
            'target.status_pembayaran' => 'nullable|string',
            'target.status_order' => 'nullable|string',
            'status' => 'nullable|string|max:2',
            'langsung_kirim' => 'nullable|boolean',
        ]);

        if (isset($validated['target']['produk']) && !is_array($validated['target']['produk'])) {
            if (is_numeric($validated['target']['produk'])) {
                $produkId = (int) $validated['target']['produk'];
                $exists = Produk::where('id', $produkId)->exists();
                if (!$exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Produk dengan ID ' . $produkId . ' tidak ditemukan'
                    ], 422);
                }
                $validated['target']['produk'] = [$produkId];
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'target.produk harus berupa integer atau array integer'
                ], 422);
            }
        }

        // Validasi array produk jika sudah menjadi array
        if (isset($validated['target']['produk']) && is_array($validated['target']['produk'])) {
            foreach ($validated['target']['produk'] as $produkId) {
                if (!is_numeric($produkId)) {
                    return response()->json([
                        'success' => false,
                        'message' => 'target.produk.* harus berupa integer'
                    ], 422);
                }
                $produkId = (int) $produkId;
                $exists = Produk::where('id', $produkId)->exists();
                if (!$exists) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Produk dengan ID ' . $produkId . ' tidak ditemukan'
                    ], 422);
                }
            }
        }

        // Hitung total target berdasarkan kondisi
        $totalTarget = $this->countTarget($validated['target']);

        // Jika langsung kirim, set tanggal_kirim ke null (akan dikirim sekarang)
        // Jika jadwalkan, gunakan tanggal_kirim yang diberikan
        $tanggalKirim = $validated['langsung_kirim'] ? null : ($validated['tanggal_kirim'] ?? null);

        $broadcast = Broadcast::create([
            'nama' => $validated['nama'],
            'pesan' => $validated['pesan'],
            'tanggal_kirim' => $tanggalKirim,
            'target' => json_encode($validated['target']),
            'total_target' => (string) $totalTarget,
            'status' => $validated['status'] ?? '1',
            'create_at' => now(),
            'update_at' => now(),
        ]);

        // Jika langsung kirim, proses ke queue RabbitMQ
        $sentCount = 0;
        $failedCount = 0;
        $totalOrders = 0;
        
        if (!empty($validated['langsung_kirim']) && $validated['langsung_kirim']) {
            try {
                // Ambil orders berdasarkan target
                $orders = $this->getOrdersByTarget($validated['target']);
                $totalOrders = $orders->count();

                if ($orders->isNotEmpty()) {
                    $woowaKey = env('WOOWA_KEY');
                    $userId = auth()->id();

                    // Group orders by customer untuk menghindari duplikasi kirim ke customer yang sama
                    // Satu customer hanya dapat 1 pesan per broadcast, ambil order pertama saja
                    $uniqueOrdersByCustomer = $orders->unique('customer')->values();

                    foreach ($uniqueOrdersByCustomer as $order) {
                        try {
                            // onQueue sudah di-set di constructor SendBroadcastJob, jadi tidak perlu dipanggil lagi
                            SendBroadcastJob::dispatch(
                                $broadcast->id,
                                $broadcast->pesan,
                                $woowaKey,
                                $order->id,
                                $order->customer,
                                $userId
                            );

                            $sentCount++;
                        } catch (\Exception $e) {
                            Log::error('Gagal dispatch broadcast job saat langsung kirim', [
                                'broadcast_id' => $broadcast->id,
                                'order_id' => $order->id,
                                'customer_id' => $order->customer,
                                'error' => $e->getMessage()
                            ]);
                            $failedCount++;
                        }
                    }
                }
            } catch (\Exception $e) {
                Log::error('Error saat proses langsung kirim broadcast', [
                    'broadcast_id' => $broadcast->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        $responseData = [
            'success' => true,
            'message' => 'Broadcast berhasil dibuat' . (!empty($validated['langsung_kirim']) && $validated['langsung_kirim'] ? ' dan sedang diproses ke queue' : ''),
            'data' => $broadcast
        ];

        // Tambahkan info pengiriman jika langsung kirim
        if (!empty($validated['langsung_kirim']) && $validated['langsung_kirim']) {
            $responseData['data'] = array_merge($broadcast->toArray(), [
                'sent_to_queue' => $sentCount,
                'failed' => $failedCount,
                'total_target' => $totalOrders
            ]);
        }

        return response()->json($responseData, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $broadcast = Broadcast::find($id);

        if (!$broadcast) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $broadcast
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $broadcast = Broadcast::find($id);

        if (!$broadcast) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast tidak ditemukan'
            ], 404);
        }

        $validated = $request->validate([
            'nama' => 'nullable|string|max:255',
            'pesan' => 'nullable|string',
            'tanggal_kirim' => 'nullable|date',
            'target' => 'nullable|array',
            'status' => 'nullable|string|max:2',
        ]);

        // Hitung total target jika target diupdate
        $totalTarget = $broadcast->total_target;
        if (isset($validated['target'])) {
            $totalTarget = $this->countTarget($validated['target']);
        }

        $updateData = [];
        if (isset($validated['nama'])) $updateData['nama'] = $validated['nama'];
        if (isset($validated['pesan'])) $updateData['pesan'] = $validated['pesan'];
        if (isset($validated['tanggal_kirim'])) $updateData['tanggal_kirim'] = $validated['tanggal_kirim'];
        if (isset($validated['target'])) {
            $updateData['target'] = json_encode($validated['target']);
            $updateData['total_target'] = (string) $totalTarget;
        }
        if (isset($validated['status'])) $updateData['status'] = $validated['status'];
        $updateData['update_at'] = now();

        $broadcast->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Broadcast berhasil diperbarui',
            'data' => $broadcast
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $broadcast = Broadcast::find($id);

        if (!$broadcast) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast tidak ditemukan'
            ], 404);
        }

        $broadcast->update([
            'status' => 'N',
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Broadcast berhasil dihapus'
        ]);
    }

    /**
     * Kirim broadcast ke semua target
     */
    public function send($id)
    {
        $broadcast = Broadcast::find($id);

        if (!$broadcast) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast tidak ditemukan'
            ], 404);
        }

        if ($broadcast->status == 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast sudah tidak aktif'
            ], 400);
        }

        // Parse target dari JSON
        $target = is_array($broadcast->target) ? $broadcast->target : json_decode($broadcast->target, true);
        
        if (!$target || empty($target)) {
            return response()->json([
                'success' => false,
                'message' => 'Target tidak valid'
            ], 400);
        }

        // Ambil orders berdasarkan target
        $orders = $this->getOrdersByTarget($target);

        if ($orders->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada order yang sesuai dengan target'
            ], 400);
        }

        $woowaKey = env('WOOWA_KEY');
        $userId = auth()->id(); // User yang mengirim broadcast
        $sentCount = 0;
        $failedCount = 0;

        // Group orders by ID untuk menghindari duplikasi
        $uniqueOrders = $orders->unique('id');

        foreach ($uniqueOrders as $order) {
            try {
                // onQueue sudah di-set di constructor SendBroadcastJob, jadi tidak perlu dipanggil lagi
                SendBroadcastJob::dispatch(
                    $broadcast->id,
                    $broadcast->pesan,
                    $woowaKey,
                    $order->id,
                    $order->customer,
                    $userId
                );

                $sentCount++;
            } catch (\Exception $e) {
                Log::error('Gagal dispatch broadcast job', [
                    'broadcast_id' => $broadcast->id,
                    'order_id' => $order->id,
                    'error' => $e->getMessage()
                ]);
                $failedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Broadcast berhasil dikirim ke queue',
            'data' => [
                'broadcast_id' => $broadcast->id,
                'total_target' => $orders->count(),
                'sent_to_queue' => $sentCount,
                'failed' => $failedCount
            ]
        ]);
    }

    /**
     * Hitung total target berdasarkan kondisi
     */
    private function countTarget(array $target): int
    {
        $query = OrderCustomer::query();
        $this->applyTargetConditions($query, $target);
        return $query->count();
    }

    /**
     * Ambil orders berdasarkan target conditions
     */
    private function getOrdersByTarget(array $target)
    {
        $query = OrderCustomer::with(['customer_rel', 'produk_rel'])
            ->where('status', '!=', 'N')
            ->distinct();

        $this->applyTargetConditions($query, $target);

        return $query->get();
    }

    /**
     * Apply target conditions ke query
     */
    private function applyTargetConditions($query, array $target)
    {
        // Filter berdasarkan produk
        if (isset($target['produk'])) {
            if (is_array($target['produk'])) {
                $query->whereIn('produk', $target['produk']);
            } else {
                $query->where('produk', $target['produk']);
            }
        }

        // Filter berdasarkan status_pembayaran
        if (isset($target['status_pembayaran'])) {
            if (is_array($target['status_pembayaran'])) {
                $query->whereIn('status_pembayaran', $target['status_pembayaran']);
            } else {
                $query->where('status_pembayaran', $target['status_pembayaran']);
            }
        }

        // Filter berdasarkan status_order
        if (isset($target['status_order'])) {
            if (is_array($target['status_order'])) {
                $query->whereIn('status_order', $target['status_order']);
            } else {
                $query->where('status_order', $target['status_order']);
            }
        }

        // Filter berdasarkan customer
        if (isset($target['customer'])) {
            if (is_array($target['customer'])) {
                $query->whereIn('customer', $target['customer']);
            } else {
                $query->where('customer', $target['customer']);
            }
        }

        // Filter berdasarkan sumber
        if (isset($target['sumber'])) {
            if (is_array($target['sumber'])) {
                $query->whereIn('sumber', $target['sumber']);
            } else {
                $query->where('sumber', $target['sumber']);
            }
        }

        // Filter berdasarkan tanggal (range)
        if (isset($target['tanggal_dari']) || isset($target['tanggal_sampai'])) {
            if (isset($target['tanggal_dari']) && isset($target['tanggal_sampai'])) {
                $query->whereBetween('create_at', [
                    Carbon::parse($target['tanggal_dari'])->startOfDay(),
                    Carbon::parse($target['tanggal_sampai'])->endOfDay()
                ]);
            } elseif (isset($target['tanggal_dari'])) {
                $query->where('create_at', '>=', Carbon::parse($target['tanggal_dari'])->startOfDay());
            } elseif (isset($target['tanggal_sampai'])) {
                $query->where('create_at', '<=', Carbon::parse($target['tanggal_sampai'])->endOfDay());
            }
        }

        // Filter berdasarkan total_harga (range)
        if (isset($target['harga_min']) || isset($target['harga_max'])) {
            if (isset($target['harga_min'])) {
                $query->where('total_harga', '>=', $target['harga_min']);
            }
            if (isset($target['harga_max'])) {
                $query->where('total_harga', '<=', $target['harga_max']);
            }
        }

        return $query;
    }

    /**
     * Ambil data penerima broadcast
     */
    public function penerima($id, Request $request)
    {
        $broadcast = Broadcast::find($id);

        if (!$broadcast) {
            return response()->json([
                'success' => false,
                'message' => 'Broadcast tidak ditemukan'
            ], 404);
        }

        $query = BroadcastPenerima::with(['customer_rel:id,nama,wa', 'user_rel:id,nama'])
            ->where('broadcast', $id)
            ->orderBy('send_at', 'desc');

        // Jika tidak ada request page dan per_page, tampilkan semua data
        if (!$request->has('page') && !$request->has('per_page')) {
            $penerima = $query->get();
            
            return response()->json([
                'success' => true,
                'message' => 'Data penerima berhasil diambil',
                'data' => $penerima,
            ]);
        }

        // Jika ada page atau per_page, gunakan pagination
        $perPage = $request->get('per_page', 15);
        $penerima = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data penerima berhasil diambil',
            'data' => $penerima->items(),
            'pagination' => [
                'current_page' => $penerima->currentPage(),
                'last_page' => $penerima->lastPage(),
                'per_page' => $penerima->perPage(),
                'total' => $penerima->total(),
            ],
        ]);
    }
}

