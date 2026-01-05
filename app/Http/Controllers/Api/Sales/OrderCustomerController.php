<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\Produk;
use App\Models\TemplateFollup;
use App\Models\LogsFollup;
use App\Models\OtpCus;
use App\Models\OrderPayment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;


class OrderCustomerController extends Controller
{
    
    public function index(Request $request)
    {
         $query = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa',
            'order_payment_rel:id,order_id,amount,status,payment_method,payment_type,payment_ke,tanggal,bukti_pembayaran,create_at'
        ])->withSum([
            'order_payment_rel as total_paid' => function($query) {
                $query->where('status', '=', '2');
            }
        ], 'amount');
        
        $query->orderBy('create_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $orders = $query->paginate($perPage);

        $ordersData = $orders->items();
        foreach ($ordersData as $order) {
            $order->total_paid = (float) ($order->total_paid ?? 0);
            $order->remaining = max(0, (float) ($order->total_harga ?? 0) - $order->total_paid);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data order berhasil diambil',
            'data' => $ordersData,
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function statistiOrder()
    {
        $totalOrder = OrderCustomer::where('status', '!=', 'N')
            ->count();
        
        $totalOrderUnpaid = OrderCustomer::where('status', '!=', 'N')
            ->where('status_pembayaran', '0')
            ->orWhereNull('status_pembayaran')   
            ->count();

        $totalMenungguValidasi = OrderCustomer::where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->count();

        $totalSudahDiapprove = OrderCustomer::where('status_pembayaran', '2')
            ->where('status', '!=', 'N')
            ->count();

        $totalDitolak = OrderCustomer::where('status_pembayaran', '3')
            ->where('status', '!=', 'N')
            ->count();


        return response()->json([
            'success' => true,
            'data' => [
                'total_order' => $totalOrder,
                'total_order_unpaid' => $totalOrderUnpaid,
                'total_order_menunggu' => $totalMenungguValidasi,
                'total_order_sudah_diapprove' => $totalSudahDiapprove,
                'total_order_ditolak' => $totalDitolak,
            ]
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
            'customer_rel:id,nama,wa'
        ])->withSum([
            'order_payment_rel as total_paid' => function($query) {
                $query->where('status', '!=', 'N');
            }
        ], 'amount')
        ->where('id', $id)
        ->first();        

        return response()->json([
            'success' => true,
            'data' => $query
        ]);
    }

    public function laporanMingguIni(Request $request)
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek   = Carbon::now()->endOfWeek();

        $orders = OrderCustomer::whereBetween('create_at', [$startOfWeek, $endOfWeek])
            ->select('id', 'customer', 'total_harga', 'create_at')
            ->with('customer_rel:id,nama')
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
            $pesan .= "- {$o->customer_rel->nama} | Rp" . number_format($o->total_harga, 0, ',', '.') . " | " . $o->create_at->format('d/m') . "\n";
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
            'email' => 'required|email',
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

        $existingCustomer = Customer::where('email', $request->email)
            ->where('wa', $wa)
            ->where('status', '!=', 'N')
            ->first();

        if ($existingCustomer) {
           
            $existingOrder = OrderCustomer::where('customer', $existingCustomer->id)
                ->where('produk', $request->produk)
                ->where('status', '!=', 'N')
                ->first();

            if ($existingOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda sudah pernah melakukan order untuk produk ini sebelumnya',
                    'data' => [
                        'order_id' => $existingOrder->id,
                        'produk_id' => $request->produk,
                        'produk_nama' => $produk->nama ?? null,
                    ]
                ], 400);
            }
            
            $existingCustomer->update([
                'nama' => $request->nama,
                'alamat' => $request->alamat,
                'update_at' => now(),
            ]);

 
            $statusOrder = json_decode($existingCustomer->status_order, true) ?? [];
            if (!in_array($request->produk, $statusOrder)) {
                $statusOrder[] = $request->produk;
                $existingCustomer->update([
                    'status_order' => json_encode($statusOrder),
                    'update_at' => now(),
                ]);
            }

            $customer = $existingCustomer;
        } else {

            $customer = Customer::create([
                'nama'      => $request->nama,
                'email'     => $request->email,
                'alamat'    => $request->alamat,
                'wa'        => $wa,
                'password'  => bcrypt("123456"),
                'status'    => '1',
                'status_order' => json_encode([$request->produk]),
                'create_at' => now(),
            ]);
        }

        $statusPembayaran = $request->status_pembayaran ?? '0';

        $order = OrderCustomer::create([
            'customer' => $customer->id,
            'produk' => $request->produk,
            'tanggal' => now(),
            'harga' => $request->harga,
            'total_harga' => $request->total_harga,
            'ongkir' => $request->ongkir,
            'alamat' => $request->alamat,
            'sumber' => $request->sumber,
            'metode_bayar' => $request->metode_bayar,
            'status_order' => '1',
            'create_at' => now(),
            'custom_value'  => json_encode($customValue), 
            'status' => '1',
            'status_pembayaran' => $statusPembayaran,
        ]);

        try {
            $otpCode = rand(100000, 999999);


            OtpCus::where('customer', $customer->id)->delete();

            $otp = OtpCus::create([
                'customer'   => $customer->id,
                'otp'        => $otpCode,
                'used'       => '0',
                'percobaan'  => '0',
                'create_at'  => now(),
                'expires_at' => now()->addMinutes(5),
                'status'     => '1',
            ]);


            $nama = $customer->nama ?? 'Kak';
            $otpMessage = "Halo {$nama},\n\nKode OTP kamu adalah *{$otpCode}*.\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapapun ya 😊";

            $woowaKeyOtp = env('WOOWA_KEY');
            $otpResponse = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $wa,
                    'key'      => $woowaKeyOtp,
                    'message'  => $otpMessage,
                ]);

            if (!$otpResponse->successful()) {
                \Log::warning('Gagal kirim OTP ke customer setelah order', [
                    'customer_id' => $customer->id,
                    'order_id' => $order->id,
                    'wa' => $wa,
                    'response' => $otpResponse->json()
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Error kirim OTP setelah order', [
                'customer_id' => $customer->id,
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
        }

        // Kode Quods (LAMA - DIKOMENTAR)
        // $token = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');
        // $deviceKey    = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');

        // Kirim notifikasi order (template followup)
        $woowaKey = env('WOOWA_KEY');

        $templateFollup = TemplateFollup::where('produk_id', $request->produk)
                                ->where('type', '5')
                                ->first();

        $dataText = array_merge([
                        'customer_name' => $request->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => Carbon::parse($request->create_at)->format('d-m-Y'),
                        'order_total'   => number_format($request->total_harga, 0, ',', '.'),
                    ], $fields);

        $message = $templateFollup
            ? TemplateHelper::render($templateFollup->text, $dataText)
            : "Halo {$request->nama}, terima kasih sudah order {$produk->nama}. Total pembayaran: Rp " . number_format($request->total_harga, 0, ',', '.') . ".";

        try {
            // Kode Quods (LAMA - DIKOMENTAR)
            // $response = Http::withToken($token)
            //     ->asJson()
            //     ->withHeaders([
            //         'Content-Type' => 'application/json',
            //         'Accept' => 'application/json'
            //     ])
            //     ->post('https://api.quods.id/api/message', [
            //         'device_key' => $deviceKey,
            //         'data' => [
            //             [
            //                 'phone'   => $wa,
            //                 'message' => $message,
            //             ]
            //         ]
            //     ]);

            $response = Http::asJson()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json'
                ])
                ->post('https://notifapi.com/send_message', [
                    'phone_no' => $wa,
                    'key'      => $woowaKey,
                    'message'  => $message,
                ]);

            $this->logFollowupMessage(
                $templateFollup,
                $customer,
                $message,
                $response->successful(),
                $response->json()
            );

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                    'data' => [
                        'order' => $order,
                        'customer' => $customer,
                        'whatsapp_response' => $response->json()
                    ]
                ], 200);
            }

            return response()->json([
                'success' => false,
                'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
                'status' => $response->status(),
                'error' => $message
            ], $response->status());
        } catch (\Exception $e) {
            $this->logFollowupMessage(
                $templateFollup,
                $customer,
                $message,
                false,
                ['error' => $e->getMessage()]
            );
            return response()->json([
                'success' => false,
                'message' => 'Order tersimpan tapi terjadi kesalahan saat kirim pesan',
                'error' => $e->getMessage()
            ], 500);
        }

        // return response()->json([
        //         'success' => true,
        //         'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
        //         'data' => $order
        //     ], 200);

       
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
                'provinsi'  => $request->provinsi,
                'kabupaten' => $request->kabupaten,
                'kecamatan' => $request->kecamatan,
                'kode_pos'  => $request->kode_pos,
                'status'    => '1',
                'status_order' => json_encode([$request->produk]),
                'password'  => bcrypt("123456"),
                'keanggotaan' => 'basic', // Default keanggotaan
                'create_at' => now(),
            ]);

            // Generate memberID setelah customer dibuat
            $memberID = $this->generateMemberID($customer);
            $customer->update(['memberID' => $memberID]);

            $customerId = $customer->id;     
          
        } else {
            $existingCustomer = Customer::find($customerId);
            if ($existingCustomer) {
                $statusOrder = json_decode($existingCustomer->status_order, true) ?? [];
                if (!in_array($request->produk, $statusOrder)) {
                    $statusOrder[] = $request->produk;
                    $existingCustomer->update([
                        'status_order' => json_encode($statusOrder),
                        'update_at' => now(),
                    ]);
                }
            }
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

        $dataCustomer = null;

        if($request->notif)
        {
            // Kode Quods (LAMA - DIKOMENTAR)
            // $token = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');
            // $deviceKey    = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');

      
            if (!$dataCustomer && $customerId) {
                $dataCustomer = Customer::where('id', $customerId)->first();
            }

            $woowaKey = env('WOOWA_KEY');

            $templateFollup = TemplateFollup::where('produk_id', $request->produk)
                                    ->where('type', '5')
                                    ->first();


            $dataText = array_merge([
                            'customer_name' => $dataCustomer->nama ?? '',
                            'product_name'  => $produk->nama ?? '',
                            'order_date'    => Carbon::parse($request->create_at)->format('d-m-Y'),
                            'order_total'   => number_format($request->total_harga, 0, ',', '.'),
                        ], $fields);

            $message = $templateFollup
                ? TemplateHelper::render($templateFollup->text, $dataText)
                : "Halo {$dataCustomer->nama}, terima kasih sudah order {$produk->nama}. Total pembayaran: Rp " . number_format($request->total_harga, 0, ',', '.') . ".";

            try {
                // Kode Quods (LAMA - DIKOMENTAR)
                // $response = Http::withToken($token)
                //     ->asJson()
                //     ->withHeaders([
                //         'Content-Type' => 'application/json',
                //         'Accept' => 'application/json'
                //     ])
                //     ->post('https://api.quods.id/api/message', [
                //         'device_key' => $deviceKey,
                //         'data' => [
                //             [
                //                 'phone'   => $dataCustomer->wa,
                //                 'message' => $message,
                //             ]
                //         ]
                //     ]);

                $response = Http::asJson()
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json'
                    ])
                    ->post('https://notifapi.com/send_message', [
                        'phone_no' => $dataCustomer->wa,
                        'key'      => $woowaKey,
                        'message'  => $message,
                    ]);

                $this->logFollowupMessage(
                    $templateFollup,
                    $dataCustomer,
                    $message,
                    $response->successful(),
                    $response->json()
                );

                if ($response->successful()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                        'data' => [
                            'order' => $dataCustomer->wa,
                            'whatsapp_response' => $response->json()
                        ]
                    ], 200);
                }

                return response()->json([
                    'success' => false,
                    'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
                    'status' => $response->status(),
                    'error' => $message
                ], $response->status());
            } catch (\Exception $e) {
                $this->logFollowupMessage(
                    $templateFollup,
                    $dataCustomer,
                    $message,
                    false,
                    ['error' => $e->getMessage()]
                );
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
            'amount' => 'required|string',
            'waktu_pembayaran' => 'required|string',
            'bukti_pembayaran' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'metode_pembayaran' => 'required|string',
        ]);


        $headerPath = $request->file('bukti_pembayaran')->store('order/bukti', 'public');

        $payment_ke = OrderPayment::where('order_id', $id)->max('payment_ke') + 1;
        if(!$payment_ke)
        {
            $payment_ke = 1;
        }
        
        $orderPayment = new OrderPayment();
        $orderPayment->order_id = $id;
        $orderPayment->amount = $request->amount;
        $orderPayment->tanggal = $request->waktu_pembayaran;
        $orderPayment->bukti_pembayaran = $headerPath;
        $orderPayment->payment_method =  $request->metode_pembayaran;
        $orderPayment->payment_type = '1';
        $orderPayment->payment_ke = $payment_ke;
        $orderPayment->create_at = now();
        $orderPayment->status = '1';
        $orderPayment->save();

        $order->update([         
            'update_at' => now(),
            'status_pembayaran' => '1'
        ]);

        try {
            $customer = Customer::find($order->customer);
            $produk = Produk::find($order->produk);

            if ($customer && $customer->wa) {
                $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                    ->where('type', '6')
                    ->first();

                $dataText = [
                    'customer_name' => $customer->nama ?? '',
                    'product_name'  => $produk->nama ?? '',
                    'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                    'order_total'   => number_format($order->total_harga ?? 0, 0, ',', '.'),
                    'payment_method'=> $order->metode_bayar ?? $request->metode_pembayaran,
                    'payment_time'  => $order->waktu_pembayaran ?? $request->waktu_pembayaran,
                    'payment_ke'    => $payment_ke,
                    'amount'        => $order->amount ?? $request->amount,
                    'amount_total'  => $order->total_harga ?? $request->total_harga,
                    'amount_remaining' => $order->total_harga - $order->amount ?? $request->total_harga - $request->amount,
                    'amount_remaining_formatted' => number_format(($order->total_harga - $order->amount), 0, ',', '.'),
                ];

                $message = $templateFollup
                    ? TemplateHelper::render($templateFollup->text, $dataText)
                    : "Halo {$customer->nama}, pembayaran untuk {$produk->nama} telah kami terima. Terima kasih 🙏";

                $woowaKey = env('WOOWA_KEY');

                $response = Http::asJson()
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                        'Accept' => 'application/json'
                    ])
                    ->post('https://notifapi.com/send_message', [
                        'phone_no' => $customer->wa,
                        'key'      => $woowaKey,
                        'message'  => $message,
                    ]);

                $this->logFollowupMessage(
                    $templateFollup,
                    $customer,
                    $message,
                    $response->successful(),
                    $response->json()
                );
            }
        } catch (\Exception $e) {
            $this->logFollowupMessage(
                $templateFollup ?? null,
                $customer ?? null,
                $message ?? '',
                false,
                ['error' => $e->getMessage()]
            );
            \Log::warning('Gagal kirim notifikasi konfirmasi pembayaran', [
                'order_id' => $order->id,
                'customer_id' => $order->customer,
                'error' => $e->getMessage()
            ]);
        }


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

    private function logFollowupMessage(?TemplateFollup $template, ?Customer $customer, string $message, bool $success, $response = null): void
    {
        if (!$customer) {
            return;
        }

        $templateType = $template->type ?? '-';
        $statusText = $success ? 'sukses' : 'gagal';

        $keterangan = "Kirim WA follow up type {$templateType} ke {$customer->wa} ({$customer->nama}). Status: {$statusText}. Pesan: {$message}";

        if ($response !== null) {
            $responseText = is_array($response) ? json_encode($response) : (string) $response;
            $keterangan .= "\nResponse: {$responseText}";
        }

        LogsFollup::create([
            'follup' => $template->id ?? null,
            'customer' => $customer->id,
            'keterangan' => $keterangan,
            'create_at' => now(),
            'update_at' => now(),
            'status' => $success ? '1' : '0',
        ]);
    }

    public function archive($id)
    {
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }
    }

    /**
     * Generate MemberID dari create_at
     * Format: 2025010100001 (tahun, bulan, tanggal, no urut)
     */
    private function generateMemberID($customer)
    {
        // Ambil create_at atau gunakan tanggal sekarang
        $createAt = $customer->create_at ?? now();
        
        // Jika create_at adalah string, convert ke Carbon
        if (is_string($createAt)) {
            $createAt = Carbon::parse($createAt);
        }
        
        // Format: YYYYMMDD
        $datePart = $createAt->format('Ymd');
        
        // Hitung no urut berdasarkan jumlah customer yang dibuat pada tanggal yang sama
        $sameDateCustomers = Customer::whereDate('create_at', $createAt->format('Y-m-d'))
            ->where('id', '<=', $customer->id)
            ->count();
        
        // Format no urut dengan 5 digit (00001)
        $sequence = str_pad($sameDateCustomers, 5, '0', STR_PAD_LEFT);
        
        // Gabungkan: YYYYMMDD + 00001
        $memberID = $datePart . $sequence;
        
        return $memberID;
    }
}

