<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\OrderPayment;
use Illuminate\Support\Facades\Validator;

class OrderValidationController extends Controller
{
   
    public function index(Request $request)
    {
        $query = OrderPayment::with([
            'order_rel:id,customer,produk,total_harga',
            'order_rel.produk_rel:id,nama,kode',
            'order_rel.customer_rel:id,nama,email,wa'
        ])
        ->where('status', '!=', 'N')
        ->orderBy('create_at', 'desc');

        if ($request->has('status') && $request->status !== '' && $request->status !== null) {
            $query->where('status', $request->status);
        }

        if ($request->has('tanggal_dari')) {
            $query->whereDate('create_at', '>=', $request->tanggal_dari);
        }

        if ($request->has('tanggal_sampai')) {
            $query->whereDate('create_at', '<=', $request->tanggal_sampai);
        }

        if ($request->has('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        $perPage = $request->get('per_page', 15);
        $payments = $query->paginate($perPage);

        $paymentsData = $payments->items();
        foreach ($paymentsData as $payment) {
            $order = $payment->order_rel;
            $totalHarga = (float) ($order->total_harga ?? 0);
            
            $totalPaid = OrderPayment::where('order_id', $payment->order_id)
                ->where('status', '2')
                ->sum('amount');
            
            $payment->total_paid = (float) $totalPaid;
            $payment->remaining = max(0, $totalHarga - $totalPaid);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data pembayaran yang perlu divalidasi berhasil diambil',
            'data' => $paymentsData,
            'pagination' => [
                'current_page' => $payments->currentPage(),
                'last_page' => $payments->lastPage(),
                'per_page' => $payments->perPage(),
                'total' => $payments->total(),
            ],
        ]);
    }


    public function show($id)
    {
        $payment = OrderPayment::with([
            'order_rel:id,customer,produk,total_harga,ongkir',
            'order_rel.produk_rel:id,nama,kode,harga_asli',
            'order_rel.customer_rel:id,nama,email,wa,alamat'
        ])
        ->where('status', '!=', 'N')
        ->find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan atau sudah divalidasi'
            ], 404);
        }

        $order = $payment->order_rel;

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
                'customer' => [
                    'id' => $order->customer_rel->id ?? null,
                    'nama' => $order->customer_rel->nama ?? null,
                    'email' => $order->customer_rel->email ?? null,
                    'wa' => $order->customer_rel->wa ?? null,
                    'alamat' => $order->customer_rel->alamat ?? null,
                ],
                'produk' => [
                    'id' => $order->produk_rel->id ?? null,
                    'nama' => $order->produk_rel->nama ?? null,
                    'kode' => $order->produk_rel->kode ?? null,
                ],
                'order' => [
                    'total_harga' => $order->total_harga ?? null,
                    'ongkir' => $order->ongkir ?? null,
                ],
            ]
        ]);
    }


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

        $payment = OrderPayment::where('status', '!=', 'N')
            ->whereIn('status', ['1', '3']) 
            ->find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan atau tidak dapat di-approve'
            ], 404);
        }

        $payment->update([
            'status' => '2',
            'catatan' => $request->catatan ?? $payment->catatan,
        ]);

        $order = OrderCustomer::find($payment->order_id);
        if ($order) {
            $totalPaid = OrderPayment::where('order_id', $order->id)
                ->where('status', '!=', 'N')
                ->where('status', '2')
                ->sum('amount');
            
            $totalHarga = (float) ($order->total_harga ?? 0);
            $remaining = max(0, $totalHarga - $totalPaid);
            
            if ($remaining <= 0) {
                $order->update([
                    'status_pembayaran' => '2',
                    'status_order' => '2',
                    'update_at' => now(),
                ]);
            }
        }

        \Log::info('Finance approve payment', [
            'payment_id' => $payment->id,
            'order_id' => $payment->order_id,
            'finance_user' => auth()->user()->id ?? null,
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran berhasil disetujui',
            'data' => [
                'id' => $payment->id,
                'status' => $payment->status,
            ]
        ]);
    }

   
    public function reject(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'catatan' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $payment = OrderPayment::where('status', '!=', 'N')
            ->whereIn('status', ['1', '2']) 
            ->find($id);

        if (!$payment) {
            return response()->json([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan atau tidak dapat di-reject'
            ], 404);
        }

        $payment->update([
            'status' => '3',
            'catatan' => $request->catatan,
        ]);

        $order = OrderCustomer::find($payment->order_id);
        $order->update([
            'status_pembayaran' => '3',
            'update_at' => now(),
        ]);

        \Log::info('Finance reject payment', [
            'payment_id' => $payment->id,
            'order_id' => $payment->order_id,
            'finance_user' => auth()->user()->id ?? null,
            'catatan' => $request->catatan,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Pembayaran ditolak',
            'data' => [
                'id' => $payment->id,
                'status' => $payment->status,
                'catatan' => $request->catatan,
            ]
        ]);
    }


    public function statistics()
    {
        $totalMenungguValidasi = OrderPayment::where('status', '1')
            ->count();

        $totalSudahDiapprove = OrderPayment::where('status', '2')
            ->count();

        $totalDitolak = OrderPayment::where('status', '3')
            ->count();

        $totalNilaiMenunggu = OrderPayment::where('status', '1')
            ->sum('amount');

        return response()->json([
            'success' => true,
            'data' => [
                'menunggu_validasi' => $totalMenungguValidasi,
                'sudah_diapprove' => $totalSudahDiapprove,
                'ditolak' => $totalDitolak,
                'total_nilai_menunggu' => (float) $totalNilaiMenunggu,
                'total_nilai_menunggu_formatted' => 'Rp ' . number_format($totalNilaiMenunggu, 0, ',', '.'),
            ]
        ]);
    }
}

