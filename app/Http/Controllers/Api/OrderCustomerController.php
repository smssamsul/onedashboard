<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\Produk;
use App\Models\TemplateFollup;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;

use Carbon\Carbon;

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

    public function laporanMingguIni(Request $request)
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek   = Carbon::now()->endOfWeek();

        $orders = OrderCustomer::whereBetween('create_at', [$startOfWeek, $endOfWeek])
            ->select('id', 'customer', 'total_harga', 'create_at')
            ->with('customer_rel:id,nama')
            ->with('produk_rel:id,nama')
            ->orderBy('create_at', 'desc')
            ->get();

        $totalPenjualan = $orders->sum('total_harga');
        $jumlahOrder = $orders->count();

        $pesan = "📊 *Laporan Order Minggu Ini*\n\n";
        $pesan .= "🗓️ Periode: " . $startOfWeek->format('d M') . " - " . $endOfWeek->format('d M Y') . "\n";
        $pesan .= "🛍️ Jumlah Order: *{$jumlahOrder}*\n";
        $pesan .= "💰 Total Penjualan: *Rp " . number_format($totalPenjualan, 0, ',', '.') . "*\n\n";
        $pesan .= "📦 Rincian Order:\n";

        foreach ($orders->take(5) as $o) {
            $pesan .= "- {$o->customer_rel->nama} | " .$o->produk_rel->nama  . " | Rp". number_format($o->total_harga, 0, ',', '.')  ." | " . $o->create_at->format('d/m') . "\n";
        }

        if ($orders->count() > 5) {
            $pesan .= "...dan lainnya (" . ($orders->count() - 5) . " order)\n";
        }

        return response()->json([
            'success' => true,
            'form'  => $request->from,
            'data' => urlencode($pesan)
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
            'custom_value' => 'nullable|array',
            // 'status' => 'required|char',
        ]);

        $wa = $this->formatPhoneNumber($request->wa);

        $produk = Produk::findOrFail($request->produk);

        $fields = json_decode($produk->custom_field, true) ?? [];

        // \Log::info('custom_field', ['data' => $fields]);
        // \Log::info('custom_value_request', ['data' => $request->custom_value]);
        $customValue = [];
        if (!empty($request->custom_value)) {
            foreach ($fields as $field) {
                $namaField = $field['nama_field'] ?? null;
                if (!$namaField) continue;

                foreach ($request->custom_value as $key => $value) {
                    if (strtolower($key) === strtolower($namaField)) {
                        $customValue[$namaField] = $value;
                        break;
                    }
                }
            }
        }

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
            'custom_value'  => json_encode($customValue), 
            'status' => '1',
        ]);

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


    public function store_admin(Request $request)
    {
        $validated = $request->validate([
            // 'customer' => 'required',
            'produk' => 'required|integer',
            'harga' => 'required|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'required|string',
            'alamat' => 'required|string',
            'sumber' => 'required|string',
            'custom_value' => 'nullable|array',
        ]);

        

        $produk = Produk::findOrFail($request->produk);

        $fields = json_decode($produk->custom_field, true) ?? [];

        $customValue = [];
        if (!empty($request->custom_value)) {
            foreach ($fields as $field) {
                $namaField = $field['nama_field'] ?? null;
                if ($namaField && isset($request->custom_value[$namaField])) {
                    $customValue[$namaField] = $request->custom_value[$namaField];
                }
            }
        }

        $customerId = $request->customer;

        if (!$customerId) {
            $wa = $this->formatPhoneNumber($request->wa);
            $customer = Customer::create([
                'nama'      => $request->nama,
                'email'     => $request->email,
                'alamat'    => $request->alamat,
                'wa'        => $wa,
                'status'    => '1',
                'create_at' => now(),
            ]);

            $customerId = $customer->id;
        }

        $orderData = [
            'customer'      => $customerId,
            'produk'        => $request->produk,
            'tanggal'       => now(),
            'harga'         => $request->harga,
            'total_harga'   => $request->total_harga,
            'ongkir'        => $request->ongkir,
            'alamat'        => $request->alamat,
            'sumber'        => $request->sumber,
            'status_order'  => '1',
            'create_at'     => now(),
            'status'        => '1',
            'custom_value'  => json_encode($customValue),
        ];

        $order = OrderCustomer::create($orderData);
        
       
        
        if($request->notif)
        {
            $deviceKey = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');
            $token     = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');

            $templateFollup = TemplateFollup::where('produk', $request->produk)
                                    ->where('type', '5')
                                    ->first();

            $dataCustomer = Customer::where('id', $customerId)
                                    ->first();

            $dataProduk = Produk::where('id', $produk)
                                    ->first();

            $dataText = array_merge([
                            'customer_name' => $dataCustomer->nama ?? '',
                            'product_name'  => $dataProduk->nama ?? '',
                            'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
                            'order_total'   => number_format($order->total_harga, 0, ',', '.'),
                        ], $field);

            $message = TemplateHelper::render($templateFollup->text, $data);

            try {
                $response = Http::withToken($token)->post('https://api.quods.id/api/direct-send', [
                    'device_key' => $deviceKey,
                    'phone'      => $wa,
                    'message'    => $message,
                ]);

                if ($response->successful()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                        'data' => [
                            'order' => $order,
                            'whatsapp_response' => $response->json()
                        ]
                    ], 200);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
                    'status' => $response->status(),
                    'error' => $response->json()
                ], $response->status());
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => 'Order tersimpan tapi terjadi kesalahan saat kirim pesan',
                    'error' => $e->getMessage()
                ], 500);
            }
        }
        
        

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
            'metode_pembayaran' => 'required|string',
        ]);


        $headerPath = $request->file('bukti_pembayaran')->store('order/bukti', 'public');
        

        // $validated['update_at'] = now();

        $order->update([
            'bukti_pembayaran' => $headerPath,
            'waktu_pembayaran' => $request->waktu_pembayaran,
            'metode_bayar' =>  $request->metode_pembayaran,            
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
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    public function archive($id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }
    }
}

