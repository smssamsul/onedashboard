<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use Illuminate\Support\Facades\Auth;

class OrderCustomerController extends Controller
{
    // GET /orders
    public function index()
    {
        $orders = OrderCustomer::all();
        return response()->json($orders);
    }

    // GET /orders/{id}
    public function show($id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }
        return response()->json($order);
    }

    // POST /orders
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer' => 'required|integer',
            'produk' => 'required|integer',
            'tanggal' => 'required|date',
            'harga' => 'required|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'required|string',
            'alamat' => 'required|string',
            'sumber' => 'nullable|string',
            'waktu_pembayaran' => 'nullable|date',
            'bukti_pembayaran' => 'nullable|string',
            'metode_bayar' => 'nullable|string',
            // 'status' => 'required|char',
        ]);

        $validated['create_at'] = now();
        $validated['update_at'] = now();

        $order = OrderCustomer::create([
            'customer' => $request->customer,
            'produk' => $request->produk,
            'tanggal' => now(),
            'harga' => $request->harga,
            'total_harga' => $request->total_harga,
            'ongkir' => $request->ongkir,
            'alamat' => $request->alamat,
            'sumber' => $request->sumber,
            // 'status_order' => $request->status_order,
            // 'verifikasi' => $request->verifikasi,
            // 'alasan_tertarik' => $request->alasan_tertarik,
            // 'alasan_belum' => $request->alasan_belum,
            // 'harapan' => $request->harapan,
            'create_at' => now(),
            'status' => '1'
        ]);
        // $order = OrderCustomer::create($validated);

        return response()->json([
            'message' => 'Order created successfully',
            'data' => $order
        ], 201);
    }

    // PUT /orders/{id}
    public function update(Request $request, $id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $validated = $request->validate([
            'customer' => 'nullable|integer',
            'produk' => 'nullable|integer',
            'tanggal' => 'nullable|date',
            'harga' => 'nullable|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'nullable|string',
            'alamat' => 'nullable|string',
            'sumber' => 'nullable|string',
            'waktu_pembayaran' => 'nullable|date',
            'bukti_pembayaran' => 'nullable|string',
            'metode_bayar' => 'nullable|string',
            'status' => 'nullable|char',
        ]);

        $validated['update_at'] = now();
        $order->update($validated);

        return response()->json([
            'message' => 'Order updated successfully',
            'data' => $order
        ]);
    }

    // DELETE /orders/{id}
    // public function destroy($id)
    // {
    //     $order = OrderCustomer::find($id);
    //     if (!$order) {
    //         return response()->json(['message' => 'Order not found'], 404);
    //     }

    //     $order->delete();
    //     return response()->json(['message' => 'Order deleted successfully']);
    // }
}