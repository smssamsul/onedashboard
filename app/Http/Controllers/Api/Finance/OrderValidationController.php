<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Validator;

class OrderValidationController extends Controller
{
    /**
     * Menampilkan daftar order yang perlu divalidasi (status_pembayaran = 2)
     */
    public function index(Request $request)
    {
        $query = OrderCustomer::with([
            'produk_rel:id,nama,kode',
            'customer_rel:id,nama,email,wa'
        ])
        ->where('status_pembayaran', '1') // Menunggu validasi finance
        ->where('status', '!=', 'N')
        ->orderBy('waktu_pembayaran', 'desc');

        // Filter berdasarkan tanggal
        if ($request->has('tanggal_dari')) {
            $query->whereDate('waktu_pembayaran', '>=', $request->tanggal_dari);
        }

        if ($request->has('tanggal_sampai')) {
            $query->whereDate('waktu_pembayaran', '<=', $request->tanggal_sampai);
        }

        // Filter berdasarkan metode bayar
        if ($request->has('metode_bayar')) {
            $query->where('metode_bayar', $request->metode_bayar);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $orders = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data order yang perlu divalidasi berhasil diambil',
            'data' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * Menampilkan detail order untuk validasi
     */
    public function show($id)
    {
        $order = OrderCustomer::with([
            'produk_rel:id,nama,kode,harga_asli',
            'customer_rel:id,nama,email,wa,alamat'
        ])
        ->where('status_pembayaran', '1')
        ->where('status', '!=', 'N')
        ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan atau sudah divalidasi'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail order berhasil diambil',
            'data' => [
                'id' => $order->id,
                'customer' => [
                    'id' => $order->customer_rel->id,
                    'nama' => $order->customer_rel->nama,
                    'email' => $order->customer_rel->email,
                    'wa' => $order->customer_rel->wa,
                    'alamat' => $order->customer_rel->alamat,
                ],
                'produk' => [
                    'id' => $order->produk_rel->id,
                    'nama' => $order->produk_rel->nama,
                    'kode' => $order->produk_rel->kode,
                ],
                'harga_asli' => $order->produk_rel->harga_asli,
                'ongkir' => $order->ongkir,
                'total_harga' => $order->total_harga,
                'metode_bayar' => $order->metode_bayar,
                'waktu_pembayaran' => $order->waktu_pembayaran,
                'bukti_pembayaran' => $order->bukti_pembayaran ? asset('storage/' . $order->bukti_pembayaran) : null,
                'status_pembayaran' => $order->status_pembayaran,
                'status_order' => $order->status_order,
                'create_at' => $order->create_at,
                'update_at' => $order->update_at,
            ]
        ]);
    }

    /**
     * Approve order (ubah status_pembayaran menjadi 3)
     */
    public function approve(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'catatan' => 'nullable|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $order = OrderCustomer::where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan atau sudah divalidasi'
            ], 404);
        }

        // Update status_pembayaran menjadi 3 (Finance Approve)
        $order->update([
            'status_pembayaran' => '3',
            'update_at' => now(),
        ]);

        // Log activity jika diperlukan
        \Log::info('Finance approve order', [
            'order_id' => $order->id,
            'finance_user' => auth()->user()->id ?? null,
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil disetujui',
            'data' => [
                'id' => $order->id,
                'status_pembayaran' => $order->status_pembayaran,
                'update_at' => $order->update_at,
            ]
        ]);
    }

    /**
     * Reject order (kembalikan status_pembayaran menjadi 1 atau 0)
     */
    public function reject(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'alasan' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $order = OrderCustomer::where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->find($id);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan atau sudah divalidasi'
            ], 404);
        }

        // Update status_pembayaran menjadi 0 (Ditolak) atau 1 (Belum bayar)
        // Kita set menjadi 0 untuk menandakan ditolak oleh finance
        $order->update([
            'status_pembayaran' => '4', // 4 = Ditolak
            'update_at' => now(),
        ]);

        // Log activity
        \Log::info('Finance reject order', [
            'order_id' => $order->id,
            'finance_user' => auth()->user()->id ?? null,
            'alasan' => $request->alasan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order ditolak',
            'data' => [
                'id' => $order->id,
                'status_pembayaran' => $order->status_pembayaran,
                'alasan' => $request->alasan,
                'update_at' => $order->update_at,
            ]
        ]);
    }

    /**
     * Statistik order validasi
     */
    public function statistics()
    {
        $totalMenungguValidasi = OrderCustomer::where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->count();

        $totalSudahDiapprove = OrderCustomer::where('status_pembayaran', '3')
            ->where('status', '!=', 'N')
            ->count();

        $totalDitolak = OrderCustomer::where('status_pembayaran', '0')
            ->where('status', '!=', 'N')
            ->count();

        $totalNilaiMenunggu = OrderCustomer::where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->get()
            ->sum(function($order) {
                return (float) ($order->total_harga ?? 0);
            });

        return response()->json([
            'success' => true,
            'data' => [
                'menunggu_validasi' => $totalMenungguValidasi,
                'sudah_diapprove' => $totalSudahDiapprove,
                'ditolak' => $totalDitolak,
                'total_nilai_menunggu' => (int) $totalNilaiMenunggu,
                'total_nilai_menunggu_formatted' => 'Rp ' . number_format($totalNilaiMenunggu, 0, ',', '.'),
            ]
        ]);
    }
}

