<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\Customer;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;

class OrderCustomerController extends Controller
{
    
    public function index()
    {

         $query = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa']);
        

        $orders = $query->orderBy('create_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }

    
    public function show($id)
    {
        $query = OrderCustomer::find($id);
        if (!$query) {
            return response()->json(['message' => 'Order not found'], 404);
        }

         $query = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa']);
        

        $orders = $query->orderBy('create_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $orders
        ]);
    }

    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string',
            'email' => 'required|email|unique:customer,email',
            'wa' => 'required|string',
            'produk' => 'required|integer',
            'harga' => 'required|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'required|string',
            'alamat' => 'required|string',
            'sumber' => 'required|string',
            'waktu_pembayaran' => 'nullable|date',
            'bukti_pembayaran' => 'nullable|string',
            'metode_bayar' => 'nullable|string',
            // 'status' => 'required|char',
        ]);

        $wa = $this->formatPhoneNumber($request->wa);

        $customer = customer::create([
            'nama'      => $request->nama,
            'email'     => $request->email,
            'alamat'    => $request->alamat,
            'wa'        => $wa,
            'status'    => '1',
            'create_at' => now(),

        ]);

        $order = OrderCustomer::create([
            'customer' => $customer->id,
            'produk' => $request->produk,
            'tanggal' => now(),
            'harga' => $request->harga,
            'total_harga' => $request->total_harga,
            'ongkir' => $request->ongkir,
            'alamat' => $request->alamat,
            'sumber' => $request->sumber,
            'status_order' => '1',
            'create_at' => now(),
            'status' => '1'
        ]);
        // $order = OrderCustomer::create($validated);

        // $deviceKey = 'rCAIkWZDFOCosr3';
        // $token     = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');

        // $message = "Terimakasih Kak ".$request->nama." pesanan anda sudah kami terima mohon segera lakukan pembayaran yaa.";
         
        // try {
        //     $response = Http::withToken($token)->post('https://api.quods.id/api/direct-send', [
        //         'device_key' => $deviceKey,
        //         'phone'      => $wa,
        //         'message'    => $message,
        //     ]);

        //     if ($response->successful()) {
        //         return response()->json([
        //             'success' => true,
        //             'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
        //             'data' => [
        //                 'order' => $order,
        //                 'whatsapp_response' => $response->json()
        //             ]
        //         ], 200);
        //     }

        //     return response()->json([
        //         'success' => false,
        //         'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
        //         'status' => $response->status(),
        //         'error' => $response->json()
        //     ], $response->status());
        // } catch (\Exception $e) {
        //     return response()->json([
        //         'success' => false,
        //         'message' => 'Order tersimpan tapi terjadi kesalahan saat kirim pesan',
        //         'error' => $e->getMessage()
        //     ], 500);
        // }

        return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                'data' => $order
            ], 200);

       
    }

    
    public function update(Request $request, $id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $validated = $request->validate([
            'harga' => 'nullable|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'nullable|string',
            'alamat' => 'nullable|string',
            'waktu_pembayaran' => 'nullable|date',
            'bukti_pembayaran' => 'nullable|string',
            'metode_bayar' => 'nullable|string',
            'status' => 'nullable|char',
        ]);

        $validated['update_at'] = now();
        $order->update($validated);

        return response()->json([
            'message' => 'Order customer berhasil diubah',
            'data' => $order
        ]);
    }

     public function konfirmasi(Request $request, $id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        
        $validated = $request->validate([
            'waktu_pembayaran' => 'required|string',
            'bukti_pembayaran' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'metode_bayar' => 'required|string',
        ]);


        $headerPath = $request->file('bukti_pembayaran')->store('order/bukti', 'public');
        

        // $validated['update_at'] = now();

        $order->update([
            'bukti_pembayaran' => $headerPath,
            'waktu_pembayaran' => $request->waktu_pembayaran,
            'metode_bayar' =>  $request->metode_bayar,            
            'update_at' => now(),
            'status_order' => '2',
            'status_pembayaran' => '1'
        ]);


        return response()->json([
            'message' => 'Konfirmasi Pembayaran Sukses',
            'data' => $order
        ]);
    }

    private function formatPhoneNumber($phone)
    {
        // Hapus semua spasi, tanda +, tanda hubung, dll
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Jika diawali dengan 0 → ubah jadi 62
        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        // Jika sudah diawali 62 → biarkan
        // Jika diawali 8 tanpa 0 → tambahkan 62 di depan
        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
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