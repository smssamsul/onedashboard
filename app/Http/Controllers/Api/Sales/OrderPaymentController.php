<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderPayment;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Validator;

class OrderPaymentController extends Controller
{
    public function index(Request $request)
    {
        $query = OrderPayment::with([
            'order_rel:id,customer,produk,total_harga',
            'order_rel.customer_rel:id,nama,email,wa',
            'order_rel.produk_rel:id,nama,kode'
        ]);

        if ($request->has('order_id') && $request->order_id !== '' && $request->order_id !== null) {
            $query->where('order_id', $request->order_id);
        }

        // Filter berdasarkan Produk ID
        $pIds = $request->input('produk_id') ?? $request->input('product_id') ?? $request->input('produk_id[]') ?? $request->input('product_id[]');
        if ($pIds) {
            $produks = is_array($pIds) ? $pIds : [$pIds];
            $produks = array_filter($produks, fn($val) => !is_null($val) && $val !== '' && $val !== 'undefined');
            if (!empty($produks)) {
                $query->whereHas('order_rel', function($q) use ($produks) {
                    $q->whereIn('produk', $produks)
                      ->orWhereIn('bundling', $produks);
                });
            }
        }

        if ($request->has('status') && $request->status !== '' && $request->status !== null) {
            $query->where('status', $request->status);
        }

        if ($request->has('payment_method') && $request->payment_method !== '' && $request->payment_method !== null) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('payment_type') && $request->payment_type !== '' && $request->payment_type !== null) {
            $query->where('payment_type', $request->payment_type);
        }

        if ($request->has('tanggal_dari')) {
            $query->whereDate('tanggal', '>=', $request->tanggal_dari);
        }

        if ($request->has('tanggal_sampai')) {
            $query->whereDate('tanggal', '<=', $request->tanggal_sampai);
        }

        $query->orderBy('id', 'desc');

        $perPage = $request->get('per_page', 15);
        $payments = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran berhasil diambil',
            'data' => $payments->items(),
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer|exists:order_customer,id',
            'amount' => 'required|numeric|min:0',
            'payment_ke' => 'required|integer|min:1',
            'payment_method' => 'nullable|string|max:50',
            'payment_type' => 'nullable|string|max:20',
            'tanggal' => 'required|date',
            'bukti_pembayaran' => 'nullable|string',
            'status' => 'nullable|string|max:2',
            'catatan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $order = OrderCustomer::find($request->order_id);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        $buktiPembayaran = $request->bukti_pembayaran;
        if ($request->hasFile('bukti_pembayaran')) {
            $buktiPembayaran = $request->file('bukti_pembayaran')->store('order/payments', 'public');
        }

        $payment = OrderPayment::create([
            'order_id' => $request->order_id,
            'amount' => $request->amount,
            'payment_ke' => $request->payment_ke,
            'payment_method' => $request->payment_method,
            'payment_type' => $request->payment_type,
            'tanggal' => $request->tanggal,
            'bukti_pembayaran' => $buktiPembayaran,
            'status' => $request->status ?? '1',
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran berhasil ditambahkan',
            'data' => $payment->load('order_rel'),
        ], 201);
    }

    public function show($id)
    {
        $payment = OrderPayment::with([
            'order_rel:id,customer,produk,total_harga',
            'order_rel.customer_rel:id,nama,email,wa',
            'order_rel.produk_rel:id,nama,kode'
        ])->find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Data pembayaran tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail pembayaran berhasil diambil',
            'data' => [
                'id' => $payment->id,
                'order_id' => $payment->order_id,
                'amount' => $payment->amount,
                'payment_ke' => $payment->payment_ke,
                'payment_method' => $payment->payment_method,
                'payment_type' => $payment->payment_type,
                'tanggal' => $payment->tanggal,
                'bukti_pembayaran' => $payment->bukti_pembayaran ? asset('storage/' . $payment->bukti_pembayaran) : null,
                'status' => $payment->status,
                'catatan' => $payment->catatan,
                'order' => $payment->order_rel,
            ]
        ]);
    }

    public function update(Request $request, $id)
    {
        $payment = OrderPayment::find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Data pembayaran tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'order_id' => 'sometimes|integer|exists:order_customer,id',
            'amount' => 'sometimes|numeric|min:0',
            'payment_ke' => 'sometimes|integer|min:1',
            'payment_method' => 'nullable|string|max:50',
            'payment_type' => 'nullable|string|max:20',
            'tanggal' => 'sometimes|date',
            'bukti_pembayaran' => 'nullable|string',
            'status' => 'nullable|string|max:2',
            'catatan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $buktiPembayaran = $request->bukti_pembayaran ?? $payment->bukti_pembayaran;
        if ($request->hasFile('bukti_pembayaran')) {
            if ($payment->bukti_pembayaran && \Storage::disk('public')->exists($payment->bukti_pembayaran)) {
                \Storage::disk('public')->delete($payment->bukti_pembayaran);
            }
            $buktiPembayaran = $request->file('bukti_pembayaran')->store('order/payments', 'public');
        }

        $payment->update([
            'order_id' => $request->order_id ?? $payment->order_id,
            'amount' => $request->amount ?? $payment->amount,
            'payment_ke' => $request->payment_ke ?? $payment->payment_ke,
            'payment_method' => $request->payment_method ?? $payment->payment_method,
            'payment_type' => $request->payment_type ?? $payment->payment_type,
            'tanggal' => $request->tanggal ?? $payment->tanggal,
            'bukti_pembayaran' => $buktiPembayaran,
            'status' => $request->status ?? $payment->status,
            'catatan' => $request->catatan ?? $payment->catatan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran berhasil diupdate',
            'data' => $payment->load('order_rel'),
        ]);
    }

    public function destroy($id)
    {
        $payment = OrderPayment::find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Data pembayaran tidak ditemukan'
            ], 404);
        }

        if ($payment->bukti_pembayaran && \Storage::disk('public')->exists($payment->bukti_pembayaran)) {
            \Storage::disk('public')->delete($payment->bukti_pembayaran);
        }

        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran berhasil dihapus',
        ]);
    }

    public function getByOrder($orderId)
    {
        $payments = OrderPayment::where('order_id', $orderId)
            ->orderBy('payment_ke', 'asc')
            ->orderBy('id', 'desc')
            ->get();

        $order = OrderCustomer::with([
            'customer_rel:id,nama,email,wa',
            'produk_rel:id,nama,kode'
        ])->find($orderId);

        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        $totalPaid = $payments->where('status', '=', '2')->sum('amount');
        $totalAmount = $order->total_harga ?? 0;
        $remaining = max(0, $totalAmount - $totalPaid);

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran berhasil diambil',
            'data' => [
                'order' => $order,
                'payments' => $payments,
                'summary' => [
                    'total_amount' => (float) $totalAmount,
                    'total_paid' => (float) $totalPaid,
                    'remaining' => (float) $remaining,
                    'count_payments' => $payments->count(),
                ]
            ]
        ]);
    }

    public function statistics(Request $request)
    {
        $query = OrderPayment::query();

        if ($request->has('tanggal_dari')) {
            $query->whereDate('tanggal', '>=', $request->tanggal_dari);
        }

        if ($request->has('tanggal_sampai')) {
            $query->whereDate('tanggal', '<=', $request->tanggal_sampai);
        }

        $totalPayments = $query->where('status', '!=', 'N')->count();
        $totalAmount = $query->where('status', '!=', 'N')->sum('amount');

        $byStatus = $query->clone()
            ->selectRaw('status, COUNT(*) as count, SUM(amount) as total')
            ->where('status', '!=', 'N')
            ->groupBy('status')
            ->get();

        $byMethod = $query->clone()
            ->selectRaw('payment_method, COUNT(*) as count, SUM(amount) as total')
            ->where('status', '!=', 'N')
            ->whereNotNull('payment_method')
            ->groupBy('payment_method')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'total_payments' => $totalPayments,
                'total_amount' => (float) $totalAmount,
                'total_amount_formatted' => 'Rp ' . number_format($totalAmount, 0, ',', '.'),
                'by_status' => $byStatus,
                'by_method' => $byMethod,
            ]
        ]);
    }
}

