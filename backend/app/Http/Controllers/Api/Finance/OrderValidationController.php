<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\OrderPayment;
use App\Models\Customer;
use App\Models\Sales;
use App\Models\Produk;
use App\Models\TemplateFollup;
use App\Helpers\TemplateHelper;
use App\Helpers\FacebookPixelLandingpageHelper;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class OrderValidationController extends Controller
{
   
    public function index(Request $request)
    {
        $query = OrderPayment::with([
            'order_rel:id,kode_order,customer,produk,total_harga',
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
            'order_rel.produk_rel:id,nama,kode,harga_asli,kategori,landingpage,event_fb_pixel',
            'order_rel.produk_rel.kategori_rel:id,nama',
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
        $produkRel = $order->produk_rel;
        $fbPixelFromLanding = FacebookPixelLandingpageHelper::extractPixelIdsFromLandingpage(
            $produkRel ? $produkRel->landingpage : null
        );

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
                'nama_pengirim' => $payment->nama_pengirim,
                'no_rek_pengirim' => $payment->no_rek_pengirim,
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
                    'id' => $produkRel?->id,
                    'nama' => $produkRel?->nama,
                    'kode' => $produkRel?->kode,
                    'fb_pixel' => $fbPixelFromLanding,
                    'event_fb_pixel' => $produkRel?->event_fb_pixel ?? [],
                    'kategori_rel' => ($produkRel && $produkRel->kategori_rel)
                        ? [
                            'id' => $produkRel->kategori_rel->id,
                            'nama' => $produkRel->kategori_rel->nama,
                        ]
                        : null,
                ],
                'order' => [
                    'kode_order' => $order->kode_order ?? null,
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

        $order = OrderCustomer::with(['customer_rel', 'produk_rel', 'bundling_rel'])->find($payment->order_id);
        
        // Update keanggotaan customer jika kategori produk adalah workshop (6)
        if ($order && $order->produk_rel && $order->customer_rel) {
            $produk = $order->produk_rel;
            
            // Cek jika kategori produk adalah 6 (workshop)
            if ($produk->kategori == 6 || $produk->kategori == '6') {
                // Ambil nama bundling dari order
                if ($order->bundling_rel && $order->bundling_rel->nama) {
                    $namaBundling = $order->bundling_rel->nama;
                    
                    // Update keanggotaan customer dengan nama bundling
                    $order->customer_rel->update([
                        'keanggotaan' => $namaBundling
                    ]);
                    
                    \Log::info('Finance approve - Update keanggotaan customer', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                        'customer_id' => $order->customer_rel->id,
                        'kategori_produk' => $produk->kategori,
                        'nama_bundling' => $namaBundling,
                        'keanggotaan_updated' => $namaBundling,
                    ]);
                } else {
                    \Log::warning('Finance approve - Bundling tidak ditemukan untuk order workshop', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                        'produk_id' => $produk->id,
                        'kategori_produk' => $produk->kategori,
                        'order_bundling_id' => $order->bundling,
                    ]);
                }
            }
        }
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

                // Auto-promote: lead → customer saat pembayaran lunas disetujui finance
                if ($order->customer_rel && $order->customer_rel->customer_type === 'lead') {
                    $order->customer_rel->update(['customer_type' => 'customer']);

                    // Update semua lead aktif terkait → CONVERTED
                    \App\Models\Lead::where('customer_id', $order->customer_rel->id)
                        ->where('status', '!=', 'N')
                        ->whereNotIn('status', ['CONVERTED', 'LOST'])
                        ->update(['status' => 'CONVERTED', 'update_at' => now()]);

                    \Log::info('Finance approve - Lead dipromote ke customer', [
                        'payment_id'  => $payment->id,
                        'order_id'    => $order->id,
                        'customer_id' => $order->customer_rel->id,
                    ]);
                }

                // Auto-dispatch Biteship shipping untuk produk fisik
                if (env('BITESHIP_AUTO_SHIPPING_ENABLED', true)) {
                    try {
                        $autoShipping = app(\App\Services\AutoBiteshipShippingService::class)->dispatchIfPhysical($order);
                        \Log::info('Finance approve - Auto Biteship shipping', [
                            'order_id' => $order->id,
                            'payment_id' => $payment->id,
                            'auto_shipping_success' => $autoShipping['success'],
                            'auto_shipping_message' => $autoShipping['message'],
                            'resi_id' => $autoShipping['resi']?->id,
                        ]);
                    } catch (\Throwable $e) {
                        \Log::error('Finance approve - Auto Biteship shipping gagal', [
                            'order_id' => $order->id,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            }
        }

        // Kirim notifikasi WhatsApp ke customer
        try {
            if ($order && $order->customer_rel && $order->customer_rel->wa) {
                $customer = $order->customer_rel;
                $produk = Produk::find($order->produk);

                // Cari template followup untuk pembayaran berhasil (type 7 atau sesuai kebutuhan)
                $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                    ->where('type', '7') // Asumsi type 7 untuk pembayaran berhasil diverifikasi
                    ->first();

                // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
                $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

                // Jika tidak ada template, gunakan pesan default
                if ($templateFollup) {
                    $dataText = [
                        'customer_name' => $customer->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                        'order_total'   => number_format($order->total_harga ?? 0, 0, ',', '.'),
                        'payment_amount' => number_format($payment->amount ?? 0, 0, ',', '.'),
                        'payment_method' => $payment->payment_method ?? '',
                        'payment_ke'    => $payment->payment_ke ?? 1,
                    ];

                    $message = TemplateHelper::render($templateFollup->text, $dataText);
                } else {
                    // Pesan default
                    $message = "Halo {$customer->nama},\n\nTerima kasih! Pembayaran Anda sebesar Rp " . number_format($payment->amount, 0, ',', '.') . " untuk produk {$produk->nama} telah berhasil diverifikasi dan disetujui.\n\nTerima kasih atas kepercayaan Anda 🙏";
                }

                // Ambil woowa_key dari sales yang terkait dengan customer
                $woowaKey = $this->getWoowaKeyFromSales($customer);

                \Log::info('Finance approve - Mengirim WhatsApp', [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'customer_id' => $customer->id,
                    'customer_wa' => $customer->wa,
                    'woowa_key_found' => $woowaKey ? true : false,
                ]);

                if (!$autoSendEnabled) {
                    \Log::info('Finance approve - Auto send Complete dimatikan, WA tidak dikirim', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                    ]);
                } elseif ($woowaKey) {
                    $waSender = app(\App\Services\WhatsAppSenderService::class);
                    $response = $waSender->sendMessage($customer->wa, $message, null, $woowaKey);

                    \Log::info('Finance approve - Response WhatsApp', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                        'http_status' => $response->status(),
                        'successful' => $response->successful(),
                        'response' => $response->json(),
                    ]);

                    if (!$response->successful()) {
                        \Log::warning('Finance approve - WhatsApp gagal dikirim', [
                            'payment_id' => $payment->id,
                            'order_id' => $payment->order_id,
                            'http_status' => $response->status(),
                            'response' => $response->json(),
                        ]);
                    }
                } else {
                    \Log::warning('Finance approve - Woowa Key tidak ditemukan', [
                        'payment_id' => $payment->id,
                        'order_id' => $payment->order_id,
                        'customer_id' => $customer->id,
                        'customer_sales_id' => $customer->sales_id,
                    ]);
                }
            } else {
                \Log::warning('Finance approve - Customer tidak memiliki nomor WA', [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->order_id,
                    'customer_id' => $order ? $order->customer : null,
                ]);
            }
        } catch (\Exception $e) {
            \Log::error('Finance approve - Exception saat kirim WhatsApp', [
                'payment_id' => $payment->id,
                'order_id' => $payment->order_id,
                'error_message' => $e->getMessage(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
            ]);
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
                'id'           => $payment->id,
                'status'       => $payment->status,
                'auto_shipping' => isset($autoShipping) ? [
                    'success' => $autoShipping['success'],
                    'message' => $autoShipping['message'],
                    'resi_id' => $autoShipping['resi']?->id,
                    'biteship_order_id' => $autoShipping['resi']?->biteship_order_id,
                ] : null,
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

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     * Jika tidak ditemukan, fallback ke env('WOOWA_KEY')
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();
        
        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        // Fallback ke env jika tidak ditemukan
        return env('WOOWA_KEY');
    }
}

