<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\ProdukBundling;
use App\Models\Produk;
use App\Models\TemplateFollup;
use App\Models\LogsFollup;
use App\Models\OtpCus;
use App\Models\OrderPayment;
use App\Models\Sales;
use App\Models\User;
use App\Helpers\FacebookPixelLandingpageHelper;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Helpers\TemplateHelper;
use App\Services\SalesRoundRobinService;
use App\Jobs\SyncContactToGoogleJob;
use Carbon\Carbon;


class OrderCustomerController extends Controller
{

    /**
     * Format: ORDddmmyyNNNN (NNNN reset per hari berdasarkan create_at).
     * Contoh: ORD0101260001
     */
    private function generateKodeOrder(Carbon $now): string
    {
        $prefix = 'ORD' . $now->format('dmy');

        // Lock baris-baris order hari ini untuk mencegah duplikasi urutan
        $lastKode = OrderCustomer::query()
            ->whereNotNull('kode_order')
            ->where('kode_order', 'like', $prefix . '%')
            ->whereDate('create_at', $now->toDateString())
            ->lockForUpdate()
            ->orderBy('kode_order', 'desc')
            ->value('kode_order');

        $lastSeq = 0;
        if (is_string($lastKode) && strlen($lastKode) >= (strlen($prefix) + 4)) {
            $tail = substr($lastKode, -4);
            if (ctype_digit($tail)) {
                $lastSeq = (int) $tail;
            }
        }

        $nextSeq = $lastSeq + 1;

        return $prefix . str_pad((string) $nextSeq, 4, '0', STR_PAD_LEFT);
    }

    private function applyOrderFilters($query, Request $request)
    {
        // Exclude status N (Deleted/Cancelled) by default
        $query->where('status', '!=', 'N');

        // Filter berdasarkan search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($subQ) use ($search) {
                $subQ->whereHas('customer_rel', function($customerQuery) use ($search) {
                    $customerQuery->where('nama', 'like', '%' . $search . '%')
                                 ->orWhere('wa', 'like', '%' . $search . '%');
                })
                ->orWhereHas('produk_rel', function($produkQuery) use ($search) {
                    $produkQuery->where('nama', 'like', '%' . $search . '%');
                })
                ->orWhereHas('customer_rel.sales_rel', function($salesQuery) use ($search) {
                    $salesQuery->where('nama', 'like', '%' . $search . '%');
                })
                ->orWhere('id', 'like', '%' . $search . '%');
            });
        }

        // Filter Tanggal - Menggunakan field 'tanggal' (varchar)
        if ($request->has('tanggal_from') && $request->has('tanggal_to')) {
            // Postgres logic for varchar substring
            $query->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) BETWEEN ? AND ?", [
                $request->tanggal_from, 
                $request->tanggal_to
            ]);
        }

        // Filter Status Order
        if ($request->has('status_order')) {
            $statusOrders = is_array($request->status_order) ? $request->status_order : [$request->status_order];
            $query->whereIn('status_order', $statusOrders);
        }

        // Filter Status Pembayaran
        if ($request->has('status_pembayaran')) {
            $statusPembayarans = is_array($request->status_pembayaran) ? $request->status_pembayaran : [$request->status_pembayaran];
            $query->whereIn('status_pembayaran', $statusPembayarans);
        }

        // Filter Produk ID (mendukung produk_id atau product_id, tunggal atau array)
        $pIds = $request->input('produk_id') ?? $request->input('product_id') ?? $request->input('produk_id[]') ?? $request->input('product_id[]');
        
        if ($pIds) {
            $produks = is_array($pIds) ? $pIds : [$pIds];
            $produks = array_filter($produks, fn($val) => !is_null($val) && $val !== '' && $val !== 'undefined');
            
            if (!empty($produks)) {
                $query->where(function($q) use ($produks) {
                    $q->whereIn('produk', $produks)
                      ->orWhereIn('bundling', $produks);
                });
            }
        }

        $this->applyUtmColumnFilters($query, $request);
    }

    /**
     * Total transfer unik: 3 digit terakhir diacak (0–999), bagian depan tetap.
     */
    private function randomizeTotalLastThreeDigits(?string $totalHargaRaw): string
    {
        $raw = (string) ($totalHargaRaw ?? '0');
        $hargaNumeric = (float) preg_replace('/[^\d.]/', '', $raw);
        if ($hargaNumeric <= 0) {
            return $raw;
        }
        $hargaDepan = (int) floor($hargaNumeric / 1000) * 1000;
        $random3Angka = random_int(0, 999);

        return (string) ($hargaDepan + $random3Angka);
    }

    private function shouldRandomizePaymentAmountTail(Request $request): bool
    {
        return trim((string) ($request->metode_bayar ?? '')) !== '';
    }

    /**
     * Order customer (landing): acak 3 digit belakang untuk semua metode pembayaran yang dipilih.
     *
     * @return array{0: string, 1: string} [harga, total_harga]
     */
    private function applyPriceTailRandomizationForStore(Request $request): array
    {
        if (!$this->shouldRandomizePaymentAmountTail($request)) {
            return [(string) $request->harga, (string) $request->total_harga];
        }

        $totalStr = $this->randomizeTotalLastThreeDigits($request->total_harga);
        $newTotal = (float) preg_replace('/[^\d.]/', '', $totalStr);
        $ongkir = (float) preg_replace('/[^\d.]/', '', (string) ($request->ongkir ?? '0'));
        $hargaLine = max(0, $newTotal - $ongkir);

        return [(string) (int) round($hargaLine), $totalStr];
    }

    /**
     * Order cepat (sales): tidak kirim metode_bayar; acak berdasarkan sumber.
     *
     * @return array{0: string, 1: string} [harga, total_harga]
     */
    private function applyPriceTailRandomizationForQuickOrder(Request $request): array
    {
        if ($request->sumber !== 'sales_quick_order') {
            return [(string) $request->harga, (string) $request->total_harga];
        }

        $totalStr = $this->randomizeTotalLastThreeDigits($request->total_harga);

        return [$totalStr, $totalStr];
    }

    public function index(Request $request)
    {
        $query = OrderCustomer::with([
            'produk_rel:id,nama,fee_trainer',
            'customer_rel:id,nama,wa,sales_id',
            'customer_rel.sales_rel:id,nama',
            'order_payment_rel:id,order_id,amount,status,payment_method,payment_type,payment_ke,tanggal,bukti_pembayaran,nama_pengirim,no_rek_pengirim,create_at',
            'bundling_rel:id,produk,nama,harga,status',
            'logs_follup:id,customer,order,type,status',
            'order_resi:id,order_id,meta,waybill_id,courier_company,courier_type,status'
        ])->withSum([
            'order_payment_rel as total_paid' => function($q_payment) {
                $q_payment->where('status', '=', '2');
            }
        ], 'amount');
        
        $this->applyOrderFilters($query, $request);
        $query->orderBy('create_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $orders = $query->paginate($perPage);

        // Menghitung statistik terfilter dengan aman
        $statsQuery = OrderCustomer::query();
        $this->applyOrderFilters($statsQuery, $request);
        
        $totalOrdersFiltered = (clone $statsQuery)->count();
        $totalAmountFiltered = (clone $statsQuery)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;
        
        $qUnpaid = (clone $statsQuery)->where(function($q) {
            $q->where('status_pembayaran', '0')
              ->orWhereNull('status_pembayaran');
        });
        $statsUnpaid = (clone $qUnpaid)->count();
        $amountUnpaid = (clone $qUnpaid)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qMenunggu = (clone $statsQuery)->where('status_pembayaran', '1');
        $statsMenunggu = (clone $qMenunggu)->count();
        $amountMenunggu = (clone $qMenunggu)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qSukses = (clone $statsQuery)->where('status_pembayaran', '2');
        $statsSukses = (clone $qSukses)->count();
        $revenueTotal = (clone $qSukses)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qDitolak = (clone $statsQuery)->where('status_pembayaran', '3');
        $statsDitolak = (clone $qDitolak)->count();
        $amountDitolak = (clone $qDitolak)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $ordersData = $orders->items();
        foreach ($ordersData as $order) {
            $order->total_paid = (float) ($order->total_paid ?? 0);
            $order->remaining = max(0, (float) ($order->total_harga ?? 0) - $order->total_paid);
            
            // Pastikan status_order dan status_pembayaran selalu ada
            if (!isset($order->status_order)) {
                $order->status_order = null;
            }
            if (!isset($order->status_pembayaran)) {
                $order->status_pembayaran = null;
            }
            
            // Tambahkan nama sales ke dalam customer_rel
            if ($order->customer_rel) {
                if ($order->customer_rel->sales_rel) {
                    $order->customer_rel->sales_nama = $order->customer_rel->sales_rel->nama ?? null;
                } else {
                    $order->customer_rel->sales_nama = null;
                }
            }

        }

        return response()->json([
            'success' => true,
            'message' => 'Data order berhasil diambil',
            'data' => $ordersData,
            'filtered_statistics' => [
                'total_order' => $totalOrdersFiltered,
                'total_amount_order' => (float) $totalAmountFiltered,
                'total_order_unpaid' => $statsUnpaid,
                'total_amount_unpaid' => (float) $amountUnpaid,
                'total_order_menunggu' => $statsMenunggu,
                'total_amount_menunggu' => (float) $amountMenunggu,
                'total_order_sudah_diapprove' => $statsSukses,
                'revenue' => (float) $revenueTotal,
                'total_order_ditolak' => $statsDitolak,
                'total_amount_ditolak' => (float) $amountDitolak,
            ],
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
            
        ]);
    }

    public function statistiOrder(Request $request)
    {
        $statsQuery = OrderCustomer::query();
        $this->applyOrderFilters($statsQuery, $request);

        $totalOrder = (clone $statsQuery)->count();
        $totalAmountOrder = (clone $statsQuery)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;
        
        $qUnpaid = (clone $statsQuery)->where(function($q) {
                $q->where('status_pembayaran', '0')
                  ->orWhereNull('status_pembayaran');
            });
        $totalOrderUnpaid = $qUnpaid->count();
        $totalAmountUnpaid = (clone $qUnpaid)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qMenunggu = (clone $statsQuery)->where('status_pembayaran', '1');
        $totalMenungguValidasi = $qMenunggu->count();
        $totalAmountMenunggu = (clone $qMenunggu)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qSukses = (clone $statsQuery)->where('status_pembayaran', '2');
        $totalSudahDiapprove = $qSukses->count();
        $revenue = (clone $qSukses)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;

        $qDitolak = (clone $statsQuery)->where('status_pembayaran', '3');
        $totalDitolak = $qDitolak->count();
        $totalAmountDitolak = (clone $qDitolak)->selectRaw('SUM(CAST(total_harga AS numeric)) as total')->value('total') ?? 0;


        return response()->json([
            'success' => true,
            'data' => [
                'total_order' => $totalOrder,
                'total_amount_order' => (float) $totalAmountOrder,
                'total_order_unpaid' => $totalOrderUnpaid,
                'total_amount_unpaid' => (float) $totalAmountUnpaid,
                'total_order_menunggu' => $totalMenungguValidasi,
                'total_amount_menunggu' => (float) $totalAmountMenunggu,
                'total_order_sudah_diapprove' => $totalSudahDiapprove,
                'revenue' => (float) $revenue,
                'total_order_ditolak' => $totalDitolak,
                'total_amount_ditolak' => (float) $totalAmountDitolak,
            ]
        ]);
    }

    public function statistiOrderPerSales()
    {
        // Ambil semua sales_id yang unik dari customer yang memiliki order
        $salesIds = Customer::whereHas('orders', function($query) {
                $query->where('status', '!=', 'N');
            })
            ->where('status', '!=', 'N')
            ->whereNotNull('sales_id')
            ->distinct()
            ->pluck('sales_id');

        $result = [];

        foreach ($salesIds as $salesId) {
            // Ambil data sales
            $sales = User::find($salesId);
            
            // Query order melalui customer yang memiliki sales_id ini
            $totalOrder = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status', '!=', 'N')
                ->count();
            
            $totalOrderUnpaid = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status', '!=', 'N')
                ->where(function($q) {
                    $q->where('status_pembayaran', '0')
                      ->orWhereNull('status_pembayaran');
                })
                ->count();

            $totalMenungguValidasi = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status_pembayaran', '1')
                ->where('status', '!=', 'N')
                ->count();

            $totalSudahDiapprove = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status_pembayaran', '2')
                ->where('status', '!=', 'N')
                ->count();

            $totalDitolak = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status_pembayaran', '3')
                ->where('status', '!=', 'N')
                ->count();

            // Hitung revenue dari order yang sudah diapprove
            // Cast total_harga ke numeric untuk PostgreSQL
            $revenue = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status_pembayaran', '2')
                ->where('status', '!=', 'N')
                ->selectRaw('SUM(CAST(total_harga AS numeric)) as total')
                ->value('total') ?? 0;

            // Hitung total revenue dari semua order (optional)
            // Cast total_harga ke numeric untuk PostgreSQL
            $totalRevenue = OrderCustomer::whereHas('customer_rel', function($query) use ($salesId) {
                    $query->where('sales_id', $salesId)
                          ->where('status', '!=', 'N');
                })
                ->where('status', '!=', 'N')
                ->selectRaw('SUM(CAST(total_harga AS numeric)) as total')
                ->value('total') ?? 0;

            $result[] = [
                'sales_id' => $salesId,
                'sales_nama' => $sales->nama ?? null,
                'total_order' => $totalOrder,
                'total_order_unpaid' => $totalOrderUnpaid,
                'total_order_menunggu' => $totalMenungguValidasi,
                'total_order_sudah_diapprove' => $totalSudahDiapprove,
                'total_order_ditolak' => $totalDitolak,
                'revenue' => (float) $revenue,
                'total_revenue' => (float) $totalRevenue,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result
        ]);
    }

    
    public function show($id)
    {
        $query = OrderCustomer::find($id);
        if (!$query) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $query = OrderCustomer::with([
            // Jangan ambil landingpage (besar) di response order show
            'produk_rel:id,nama,fee_trainer,kategori,event_fb_pixel',
            'produk_rel.kategori_rel:id,nama',
            'customer_rel:id,nama,wa',
            'bundling_rel:id,produk,nama,harga,status',
            'order_resi:id,order_id,meta,waybill_id,courier_company,courier_type,status'
        ])->withSum([
            'order_payment_rel as total_paid' => function($query) {
                $query->where('status', '!=', 'N');
            }
        ], 'amount')
        ->where('id', $id)
        ->first();

        if ($query && $query->produk_rel) {
            // Ambil hanya kolom landingpage (tanpa ikut mengirimnya ke frontend)
            $landingpage = \App\Models\Produk::where('id', $query->produk_rel->id)->value('landingpage');
            $fbPixelFromLanding = FacebookPixelLandingpageHelper::extractPixelIdsFromLandingpage($landingpage);
            $query->produk_rel->fb_pixel = $fbPixelFromLanding;
        }

        return response()->json([
            'success' => true,
            'data' => $query
        ]);
    }

    /**
     * Show logs followup per order id
     */
    public function showLogsFollup($id)
    {
        // Validasi order exists
        $order = OrderCustomer::find($id);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        // Ambil logs followup untuk order ini
        $logs = LogsFollup::with([
            'follup_rel:id,nama,type,event',
            'customer_rel:id,nama,wa',
            'order_rel:id,customer,produk,total_harga'
        ])
        ->where('order', $id)
        ->orderBy('create_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data logs followup berhasil diambil',
            'data' => [
                'order_id' => $id,
                'order' => [
                    'id' => $order->id,
                    'customer' => $order->customer,
                    'produk' => $order->produk,
                    'total_harga' => $order->total_harga,
                ],
                'logs' => $logs,
                'total' => $logs->count()
            ]
        ]);
    }

 
    public function reject(Request $request, $id)
    {
        $order = OrderCustomer::find($id);
        
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        // Update status_order menjadi 3 (reject)
        $order->update([
            'status_order' => '3',
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Order berhasil ditolak (status_order = 3)',
            'data' => $order->fresh()
        ], 200);
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
        // Try to get bundling from JSON if not in request->all()
        if (!$request->has('bundling') && $request->isJson()) {
            try {
                $jsonData = $request->json()->all();
                if (isset($jsonData['bundling'])) {
                    $request->merge(['bundling' => $jsonData['bundling']]);
                    \Log::info('OrderCustomer store - Bundling merged from JSON', [
                        'bundling' => $jsonData['bundling']
                    ]);
                }
            } catch (\Exception $e) {
                \Log::warning('OrderCustomer store - Failed to parse JSON', [
                    'error' => $e->getMessage()
                ]);
            }
        }

        \Log::info('OrderCustomer store - Request received', [
            'request_all' => $request->all(),
            'request_input_bundling' => $request->input('bundling'),
            'request_get_bundling' => $request->get('bundling'),
            'request_bundling' => $request->bundling,
            'has_bundling' => $request->has('bundling'),
            'content_type' => $request->header('Content-Type'),
            'request_method' => $request->method(),
            'is_json' => $request->isJson(),
            'raw_content' => $request->getContent(),
        ]);

        $validated = $request->validate([
            'nama' => 'required|string',
            'email' => 'required|email',
            'wa' => 'required|string',
            'produk' => 'required|integer',
            'harga' => 'required|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'required|string',
            'alamat' => 'nullable|string', 
            'sumber' => 'required|string',
            'waktu_pembayaran' => 'nullable|date',
            'bukti_pembayaran' => 'nullable|string',
            'metode_bayar' => 'nullable|string',
            'bundling' => 'required|string',
            'utm_source' => 'nullable|string|max:255',
            'utm_medium' => 'nullable|string|max:255',
            'utm_campaign' => 'nullable|string|max:255',
            'utm_term' => 'nullable|string|max:255',
            'utm_content' => 'nullable|string|max:255',
        ]);

        \Log::info('OrderCustomer store - Request validated', [
            'validated' => $validated,
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

        // Cari customer berdasarkan email ATAU nomor telepon yang sama
        $existingCustomer = Customer::where(function($query) use ($request, $wa) {
                $query->where('email', $request->email)
                      ->orWhere('wa', $wa);
            })
            ->where('status', '!=', 'N')
            ->first();

        if ($existingCustomer) {
           
            $existingOrder = OrderCustomer::where('customer', $existingCustomer->id)
                ->where('produk', $request->produk)
                ->where('status', '!=', 'N')
                ->where('status_order', '!=', '3') // Exclude order yang di-reject (status_order = 3)
                ->first();

            if ($existingOrder) {
                \Log::info('masuk existing order');
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
            
            // Update data customer dengan data baru yang berbeda
            $updateData = [
                'update_at' => now(),
            ];

            // Backfill sales_id jika customer lama belum pernah punya sales_id
            if (empty($existingCustomer->sales_id)) {
                $updateData['sales_id'] = $this->getNextSalesId((int) $request->produk);
            }

            // Update nama jika berbeda
            if ($existingCustomer->nama != $request->nama) {
                $updateData['nama'] = $request->nama;
            }

            // Update alamat jika berbeda
            if ($request->alamat && $existingCustomer->alamat != $request->alamat) {
                $updateData['alamat'] = $request->alamat;
            }

            // Update email jika berbeda dan belum ada
            if ($existingCustomer->email != $request->email) {
                $updateData['email'] = $request->email;
            }

            // Update wa jika berbeda dan belum ada
            if ($existingCustomer->wa != $wa) {
                $updateData['wa'] = $wa;
            }

            // Update provinsi jika ada dan berbeda
            if ($request->provinsi && $existingCustomer->provinsi != $request->provinsi) {
                $updateData['provinsi'] = $request->provinsi;
            }

            // Update kabupaten jika ada dan berbeda
            if ($request->kabupaten && $existingCustomer->kabupaten != $request->kabupaten) {
                $updateData['kabupaten'] = $request->kabupaten;
            }

            // Update kecamatan jika ada dan berbeda
            if ($request->kecamatan && $existingCustomer->kecamatan != $request->kecamatan) {
                $updateData['kecamatan'] = $request->kecamatan;
            }

            // Update kode_pos jika ada dan berbeda
            if ($request->kode_pos && $existingCustomer->kode_pos != $request->kode_pos) {
                $updateData['kode_pos'] = $request->kode_pos;
            }

            // Update data jika ada perubahan
            if (count($updateData) > 1) { // Lebih dari 1 karena selalu ada update_at
                $existingCustomer->update($updateData);
            }

            // Update status_order untuk menambahkan produk baru
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
            \Log::info('masuk new customer');

            // Sales dari assign produk: 0/2+ round-robin, 1 sales tetap
            $sales_id = $this->getNextSalesId((int) $request->produk);

            $customer = Customer::create([
                'nama'      => $request->nama,
                'sales_id'  => $sales_id,
                'email'     => $request->email,
                'alamat'    => $request->alamat,
                'wa'        => $wa,
                // 'password'  => bcrypt("123456"),
                'status'    => '1',
                'status_order' => json_encode([$request->produk]),
                'keanggotaan' => 'basic',
                'provinsi' => $request->provinsi,
                'kabupaten' => $request->kabupaten,
                'kecamatan' => $request->kecamatan,
                'kode_pos' => $request->kode_pos,
                'create_at' => now(),
            ]);

            // Generate memberID setelah customer dibuat
            $memberID = $this->generateMemberID($customer);
            $customer->update(['memberID' => $memberID]);
        }

        $statusPembayaran = $request->status_pembayaran ?? '0';

        // Process bundling - simpan hanya ID bundling (integer, foreign key)

        [$hargaOrder, $totalHarga] = $this->applyPriceTailRandomizationForStore($request);

        $now = now();
        $generatedKodeOrder = null;
        $order = DB::transaction(function () use ($request, $customer, $hargaOrder, $totalHarga, $customValue, $statusPembayaran, $now, &$generatedKodeOrder) {
            $kodeOrder = $this->generateKodeOrder(Carbon::parse($now));
            $generatedKodeOrder = $kodeOrder;

            $cv = is_array($customValue) ? $customValue : (json_decode((string) $customValue, true) ?: []);
            $cv['kode_order'] = $kodeOrder;

            $created = OrderCustomer::create([
                'customer' => $customer->id,
                'produk' => $request->produk,
                'kode_order' => $kodeOrder,
                'tanggal' => $now,
                'harga' => $hargaOrder,
                'total_harga' => $totalHarga,
                'ongkir' => $request->ongkir,
                'alamat' => $request->alamat,
                'sumber' => $request->sumber,
                'metode_bayar' => $request->metode_bayar,
                'status_order' => '1',
                'create_at' => $now,
                'custom_value'  => json_encode($cv),
                'bundling' => $request->bundling ?? '',
                'status' => '1',
                'status_pembayaran' => $statusPembayaran,
                'utm_source' => $request->utm_source,
                'utm_medium' => $request->utm_medium,
                'utm_campaign' => $request->utm_campaign,
                'utm_term' => $request->utm_term,
                'utm_content' => $request->utm_content,
            ]);
            // Safety: pastikan kode_order benar-benar tersimpan
            if (empty($created->kode_order) && !empty($kodeOrder)) {
                $created->kode_order = $kodeOrder;
                $created->save();
            }
            return $created;
        });

        // Dispatch job async ke Redis queue → sync ke Google Contacts
        if (!empty($customer->wa)) {
            // "langsung di save no nya ya ke google ya"
            SyncContactToGoogleJob::dispatchSync($customer->nama ?? '', $customer->wa, $customer->id, (string) ($customer->sales_id ?? '1'));
        }

        // try {
        //     $otpCode = rand(100000, 999999);


        //     OtpCus::where('customer', $customer->id)->delete();

        //     $otp = OtpCus::create([
        //         'customer'   => $customer->id,
        //         'otp'        => $otpCode,
        //         'used'       => '0',
        //         'percobaan'  => '0',
        //         'create_at'  => now(),
        //         'expires_at' => now()->addMinutes(5),
        //         'status'     => '1',
        //     ]);


            $woowaKey = $this->getWoowaKeyFromSales($customer);
        //     $nama = $customer->nama ?? 'Kak';
        //     $otpMessage = "Halo {$nama},\n\nKode OTP kamu adalah *{$otpCode}*.\n\nKode ini berlaku selama 5 menit. Jangan bagikan ke siapapun ya 😊";

        //     $otpResponse = Http::asJson()
        //         ->withHeaders([
        //             'Content-Type' => 'application/json',
        //             'Accept' => 'application/json'
        //         ])
        //         ->post('https://notifapi.com/send_message', [
        //             'phone_no' => $wa,
        //             'key'      => $woowaKey,
        //             'message'  => $otpMessage,
        //         ]);

        //     if (!$otpResponse->successful()) {
        //         \Log::warning('Gagal kirim OTP ke customer setelah order', [
        //             'customer_id' => $customer->id,
        //             'order_id' => $order->id,
        //             'wa' => $wa,
        //             'response' => $otpResponse->json()
        //         ]);
        //     }
        // } catch (\Exception $e) {
        //     \Log::error('Error kirim OTP setelah order', [
        //         'customer_id' => $customer->id,
        //         'order_id' => $order->id,
        //         'error' => $e->getMessage()
        //     ]);
        // }

        // Kode Quods (LAMA - DIKOMENTAR)
        // $token = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');
        // $deviceKey    = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');

        // Kirim notifikasi order (template followup)
        // Ambil woowa_key dari sales yang terkait dengan customer

        $templateFollup = TemplateFollup::where('produk_id', $request->produk)
                                ->where('type', '5')
                                ->first();

        // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
        $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

        $totalHargaFloat = (float) preg_replace('/[^\d.]/', '', (string) $totalHarga);
        $dataText = array_merge([
                        'customer_name' => $request->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => Carbon::parse($request->create_at)->format('d-m-Y'),
                        'order_total'   => number_format($totalHargaFloat, 0, ',', '.'),
                        'link upload pembayaran' => 'https://app.ternakproperti.com/upload-payment/' . $order->kode_order,
                    ], $fields);

        $message = $templateFollup
            ? TemplateHelper::render($templateFollup->text, $dataText)
            : "Halo {$request->nama}, terima kasih sudah order {$produk->nama}. Total pembayaran: Rp " . number_format($totalHargaFloat, 0, ',', '.') . ".";

        if (!$autoSendEnabled) {
            return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibuat (auto send Welcome dimatikan)',
                'data' => [
                    'order' => $order,
                    'customer' => $customer,
                    'whatsapp_sent' => false,
                ],
            ], 200);
        }

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

            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $salesId = $customer->sales_id ?? null;
            $response = $waSender->sendMessage($wa, $message, $salesId, $woowaKey);

            $this->logFollowupMessage(
                $templateFollup,
                $customer,
                $message,
                $response->successful(),
                $response->json(),
                $order->id,
                'order dibuat'
            );

            if ($response->successful()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                    'data' => [
                        'order' => $order,
                        'customer' => $customer,
                        'whatsapp_sent' => true,
                        'whatsapp_response' => $response->json(),
                    ],
                ], 200);
            }

            return response()->json([
                'success' => true,
                'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
                'data' => [
                    'order' => $order,
                    'customer' => $customer,
                    'whatsapp_sent' => false,
                    'whatsapp_http_status' => $response->status(),
                    'whatsapp_response' => $response->json(),
                ],
            ], 200);
        } catch (\Exception $e) {
            \Log::error('OrderCustomer store - Exception: ' . $e->getMessage());
            $this->logFollowupMessage(
                $templateFollup,
                $customer,
                $message,
                false,
                ['error' => $e->getMessage()],
                $order->id ?? null,
                'order dibuat'
            );
            return response()->json([
                'success' => true,
                'message' => 'Order tersimpan tapi terjadi kesalahan saat kirim pesan',
                'data' => [
                    'order' => $order,
                    'customer' => $customer,
                    'whatsapp_sent' => false,
                    'whatsapp_error' => $e->getMessage(),
                ],
            ], 200);
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
            'customer' => 'nullable|integer',
            'nama' => 'required_without:customer|string|max:255',
            'wa' => 'required_without:customer|string|max:50',
            'email' => 'nullable|email|max:255',
            'alamat' => 'nullable|string|max:500',
            // 'customer' => 'required',
            'produk' => 'required|integer',
            'harga' => 'required|string',
            'ongkir' => 'nullable|string',
            'total_harga' => 'required|string',
            'sumber' => 'required|string',
            'custom_value' => 'nullable|array',
            'bundling' => 'nullable|string', // ID bundling (foreign key ke produk_bundling)
            'utm_source' => 'nullable|string|max:255',
            'utm_medium' => 'nullable|string|max:255',
            'utm_campaign' => 'nullable|string|max:255',
            'utm_term' => 'nullable|string|max:255',
            'utm_content' => 'nullable|string|max:255',
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

        $customerId = $request->customer ? (int) $request->customer : null;
        $produkId = (int) $request->produk;

        if ($customerId) {
            $dupOrder = $this->findActiveOrderForCustomerProduct($customerId, $produkId);
            if ($dupOrder) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nomor WA / customer ini sudah memiliki order aktif untuk produk yang sama. Order baru tidak dibuat.',
                    'data' => [
                        'order_id' => $dupOrder->id,
                        'customer_id' => $customerId,
                        'produk_id' => $produkId,
                    ],
                ], 400);
            }
        }

        if (!$customerId) {
            $wa = $this->formatPhoneNumber($request->wa);
            $existingByWa = Customer::where('wa', $wa)->where('status', '!=', 'N')->first();
            if ($existingByWa) {
                $dupOrder = $this->findActiveOrderForCustomerProduct((int) $existingByWa->id, $produkId);
                if ($dupOrder) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Nomor WA ini sudah memiliki order aktif untuk produk yang sama. Order baru tidak dibuat.',
                        'data' => [
                            'order_id' => $dupOrder->id,
                            'customer_id' => $existingByWa->id,
                            'produk_id' => $produkId,
                        ],
                    ], 400);
                }
                $customerId = (int) $existingByWa->id;
            } else {
                $roundRobinSalesId = $this->getNextSalesId((int) $request->produk);

                // Sales staff (divisi 3, level 2): customer selalu di-assign ke sales yang sedang input (user.id),
                // bukan round-robin / body request (sama konsep dengan ordersForSales).
                $staffSalesUserId = null;
                $userLogin = auth('api')->user();
                if ($userLogin) {
                    $userLogin->load('userData');
                    $actor = $userLogin->userData;
                    if ($actor && (string) $actor->divisi === '3' && (string) $actor->level === '2') {
                        $staffSalesUserId = $actor->id;
                    }
                }

                $sales_id = $staffSalesUserId !== null
                    ? $staffSalesUserId
                    : ($request->sales_id ?? $roundRobinSalesId);

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
                    // 'password'  => bcrypt("123456"),
                    'keanggotaan' => 'basic', // Default keanggotaan
                    'create_at' => now(),
                    'sales_id' => $sales_id,
                ]);

                // Generate memberID setelah customer dibuat
                $memberID = $this->generateMemberID($customer);
                $customer->update(['memberID' => $memberID]);

                $customerId = $customer->id;
            }
        }

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

            // Backfill sales_id jika customer lama belum pernah punya sales_id
            if (empty($existingCustomer->sales_id)) {
                $existingCustomer->update([
                    'sales_id' => $this->getNextSalesId((int) $request->produk),
                ]);
            }
        }

        [$hargaOrder, $totalHargaOrder] = $this->applyPriceTailRandomizationForQuickOrder($request);

        $now = now();
        $generatedKodeOrder = null;
        $order = DB::transaction(function () use ($request, $customerId, $hargaOrder, $totalHargaOrder, $customValue, $now, &$generatedKodeOrder) {
            $kodeOrder = $this->generateKodeOrder(Carbon::parse($now));
            $generatedKodeOrder = $kodeOrder;

            $cv = is_array($customValue) ? $customValue : (json_decode((string) $customValue, true) ?: []);
            $cv['kode_order'] = $kodeOrder;

            $orderData = [
                'customer'      => $customerId,
                'produk'        => $request->produk,
                'kode_order'    => $kodeOrder,
                'tanggal'       => $now,
                'harga'         => $hargaOrder,
                'total_harga'   => $totalHargaOrder,
                'ongkir'        => $request->ongkir,
                'alamat'        => $request->alamat,
                'sumber'        => $request->sumber,
                'status_order'  => '1',
                'create_at'     => $now,
                'status'        => '1',
                'custom_value'  => json_encode($cv),
                'bundling'      => $request->bundling ?? '',
                'utm_source'    => $request->utm_source,
                'utm_medium'    => $request->utm_medium,
                'utm_campaign'  => $request->utm_campaign,
                'utm_term'      => $request->utm_term,
                'utm_content'   => $request->utm_content,
            ];

            logger()->info("order data", [
                'order_data'=>$orderData
            ]);
            $created = OrderCustomer::create($orderData);
            // Safety: pastikan kode_order benar-benar tersimpan
            if (empty($created->kode_order) && !empty($kodeOrder)) {
                $created->kode_order = $kodeOrder;
                $created->save();
            }
            return $created;
        });

        // Dispatch job async ke Redis queue → sync ke Google Contacts
        $syncCustomer = Customer::find($customerId);
        if ($syncCustomer && !empty($syncCustomer->wa)) {
            // "langsung di save no nya ya ke google ya"
            SyncContactToGoogleJob::dispatchSync($syncCustomer->nama ?? '', $syncCustomer->wa, $syncCustomer->id, (string) ($syncCustomer->sales_id ?? '1'));
        }

        $dataCustomer = null;

        if ($request->notif || $request->sumber === 'sales_quick_order')
        {
            if (!$dataCustomer && $customerId) {
                $dataCustomer = Customer::where('id', $customerId)->first();
            }

            // Ambil woowa_key dari sales yang terkait dengan customer
            $woowaKey = $this->getWoowaKeyFromSales($dataCustomer);

            $templateFollup = TemplateFollup::where('produk_id', $request->produk)
                                    ->where('type', '5')
                                    ->first();

            // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
            $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

            $totalNotif = (float) preg_replace('/[^\d.]/', '', (string) $totalHargaOrder);
            $dataText = array_merge([
                            'customer_name' => $dataCustomer->nama ?? '',
                            'product_name'  => $produk->nama ?? '',
                            'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
                            'order_total'   => number_format($totalNotif, 0, ',', '.'),
                        ], $fields);

            $message = $templateFollup
                ? TemplateHelper::render($templateFollup->text, $dataText)
                : "Halo {$dataCustomer->nama}, terima kasih sudah order {$produk->nama}. Total pembayaran: Rp " . number_format($totalNotif, 0, ',', '.') . ".";

            if (!$autoSendEnabled) {
                return response()->json([
                    'success' => true,
                    'message' => 'Order berhasil dibuat (auto send Welcome dimatikan)',
                    'data' => [
                        'order' => $order,
                        'customer' => $dataCustomer,
                        'whatsapp_sent' => false,
                    ],
                ], 200);
            }

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

                $waSender = app(\App\Services\WhatsAppSenderService::class);
                $salesId = $dataCustomer->sales_id ?? null;
                $response = $waSender->sendMessage($dataCustomer->wa, $message, $salesId, $woowaKey);

                $this->logFollowupMessage(
                    $templateFollup,
                    $dataCustomer,
                    $message,
                    $response->successful(),
                    $response->json(),
                    $order->id,
                    'order dibuat'
                );

                if ($response->successful()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                        'data' => [
                            'order' => $order,
                            'customer' => $dataCustomer,
                            'whatsapp_sent' => true,
                            'whatsapp_response' => $response->json(),
                        ],
                    ], 200);
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Order tersimpan tapi gagal kirim pesan WhatsApp',
                    'data' => [
                        'order' => $order,
                        'customer' => $dataCustomer,
                        'whatsapp_sent' => false,
                        'whatsapp_http_status' => $response->status(),
                        'whatsapp_response' => $response->json(),
                    ],
                ], 200);
            } catch (\Exception $e) {
                $this->logFollowupMessage(
                    $templateFollup,
                    $dataCustomer,
                    $message,
                    false,
                    ['error' => $e->getMessage()],
                    $order->id ?? null,
                    'order dibuat'
                );
                return response()->json([
                    'success' => true,
                    'message' => 'Order tersimpan tapi terjadi kesalahan saat kirim pesan',
                    'data' => [
                        'order' => $order,
                        'customer' => $dataCustomer,
                        'whatsapp_sent' => false,
                        'whatsapp_error' => $e->getMessage(),
                    ],
                ], 200);
            }
        }
        
        

        return response()->json([
                'success' => true,
                'message' => 'Order berhasil dibuat dan notifikasi telah dikirim',
                'data' => $order
            ], 200);

       
    }

    /**
     * Bulk import order cepat (array baris) — setiap baris diproses seperti store_admin.
     *
     * Payload:
     * - rows: [{ nama, wa, produk, bundling?, sumber?, notif?, utm_*? }]
     */
    public function store_admin_bulk(Request $request)
    {
        $validated = $request->validate([
            'dummy' => 'nullable|boolean',
            'notif' => 'nullable|boolean',
            'rows' => 'required|array|min:1|max:500',
            'rows.*.nama' => 'required|string|max:255',
            'rows.*.wa' => 'required|string|max:50',
            // produk_id / product_id / id_produk (angka) ATAU kode_produk / kode / slug / code
            'rows.*.produk_id' => 'nullable',
            'rows.*.product_id' => 'nullable',
            'rows.*.id_produk' => 'nullable',
            'rows.*.kode_produk' => 'nullable|string|max:255',
            'rows.*.kode' => 'nullable|string|max:255',
            'rows.*.slug' => 'nullable|string|max:255',
            'rows.*.code' => 'nullable|string|max:255',
            // bundling_id / bundle_id / paket_id
            'rows.*.bundling_id' => 'nullable',
            'rows.*.bundle_id' => 'nullable',
            'rows.*.paket_id' => 'nullable',
            // Optional override: pakai field internal juga kalau ada
            'rows.*.produk' => 'nullable|integer',
            'rows.*.bundling' => 'nullable|string',
        ]);

        $rows = $validated['rows'] ?? [];
        $isDummy = array_key_exists('dummy', $validated) ? (bool) $validated['dummy'] : false;
        $bulkNotif = array_key_exists('notif', $validated) ? (bool) $validated['notif'] : true;
        $results = [];
        $ok = 0;
        $fail = 0;

        foreach ($rows as $idx => $row) {
            try {
                // Default khusus order cepat
                $row['sumber'] = 'sales_quick_order';
                $row['utm_source'] = 'order_cepat';
                $row['notif'] = $bulkNotif;

                // Harga/total_harga wajib di store_admin. Untuk bulk import order cepat,
                // kita hitung dari Produk / ProdukBundling agar tidak bergantung pada frontend.
                $produkId = null;
                if (isset($row['produk']) && $row['produk'] !== '' && $row['produk'] !== null) {
                    $produkId = (int) $row['produk'];
                    if ($produkId <= 0) {
                        $produkId = null;
                    }
                }
                if (!$produkId) {
                    $p = $row['produk_id'] ?? $row['product_id'] ?? $row['id_produk'] ?? null;
                    if ($p !== null && $p !== '') {
                        $s = trim((string) $p);
                        if ($s !== '') {
                            if (ctype_digit($s) !== true) {
                                throw new \Exception('id_produk harus berupa angka bulat positif');
                            }
                            $produkId = (int) $s;
                            if ($produkId <= 0) {
                                throw new \Exception('id_produk tidak valid');
                            }
                        }
                    }
                }
                if (!$produkId) {
                    // coba dari kode_produk / kode / slug / code (hanya jika kolom ID tidak dipakai / kosong)
                    $kode = $row['kode_produk'] ?? $row['kode'] ?? $row['slug'] ?? $row['code'] ?? null;
                    $kode = is_string($kode) ? trim($kode) : null;
                    if ($kode) {
                        $produkId = Produk::where('kode', $kode)->value('id');
                    }
                }

                if (!$produkId) {
                    throw new \Exception('produk_id / kode_produk wajib diisi');
                }

                $row['produk'] = (int) $produkId;
                $produk = Produk::find($row['produk']);
                if (!$produk) {
                    throw new \Exception('Produk tidak ditemukan');
                }

                $harga = $produk->harga_asli ?? $produk->harga ?? 0;
                $bundlingId = $row['bundling'] ?? null;
                if (($bundlingId === null || $bundlingId === '' || $bundlingId === '0') && (isset($row['bundling_id']) || isset($row['bundle_id']) || isset($row['paket_id']))) {
                    $bundlingId = $row['bundling_id'] ?? $row['bundle_id'] ?? $row['paket_id'] ?? null;
                }
                if ($bundlingId !== null && $bundlingId !== '' && $bundlingId !== '0') {
                    $bundling = ProdukBundling::where('id', $bundlingId)
                        ->where('produk', $produk->id)
                        ->first();
                    if (!$bundling) {
                        throw new \Exception('Bundling tidak ditemukan untuk produk ini');
                    }
                    // Status bundling: '1' aktif; selain itu tetap boleh diproses? kita tolak agar konsisten.
                    if (isset($bundling->status) && ($bundling->status === '0' || $bundling->status === 0 || $bundling->status === 'N')) {
                        throw new \Exception('Bundling tidak aktif');
                    }
                    $harga = $bundling->harga ?? $harga;
                    $row['bundling'] = (string) $bundlingId;
                } else {
                    // Pastikan bundling kosong string agar store_admin konsisten
                    $row['bundling'] = '';
                }

                $row['harga'] = (string) $harga;
                $row['ongkir'] = (string) ($row['ongkir'] ?? '0');
                $row['total_harga'] = (string) $harga;

                // Sama seperti store_admin: WA disimpan dalam format internasional (62…)
                $row['wa'] = $this->formatPhoneNumber((string) ($row['wa'] ?? ''));

                // Email default kalau tidak ada
                if (empty($row['email']) && !empty($row['wa'])) {
                    $digits = preg_replace('/\D/', '', (string) $row['wa']);
                    $row['email'] = 'order_' . ($digits ?: (string) now()->timestamp) . '@quickorder.local';
                }

                // Alamat default
                if (!array_key_exists('alamat', $row) || $row['alamat'] === null || $row['alamat'] === '') {
                    $row['alamat'] = '—';
                }

                if ($isDummy) {
                    // Dummy mode: jangan simpan ke DB dan jangan kirim WA.
                    $ok++;
                    $results[] = [
                        'index' => $idx,
                        'success' => true,
                        'message' => 'DUMMY: valid',
                        'data' => [
                            'nama' => $row['nama'] ?? null,
                            'wa' => $row['wa'] ?? null,
                            'produk' => $row['produk'] ?? null,
                            'bundling' => $row['bundling'] ?? null,
                        ],
                    ];
                    continue;
                }

                // Panggil store_admin per baris
                $rowReq = new Request($row);
                $resp = $this->store_admin($rowReq);
                $payload = method_exists($resp, 'getData') ? $resp->getData(true) : null;

                if (is_array($payload) && ($payload['success'] ?? false) === true) {
                    $ok++;
                    $results[] = [
                        'index' => $idx,
                        'success' => true,
                        'message' => $payload['message'] ?? 'OK',
                        'data' => $payload['data'] ?? null,
                    ];
                } else {
                    $fail++;
                    $results[] = [
                        'index' => $idx,
                        'success' => false,
                        'message' => is_array($payload) ? ($payload['message'] ?? 'Gagal') : 'Gagal',
                        'data' => is_array($payload) ? ($payload['data'] ?? null) : null,
                    ];
                }
            } catch (\Throwable $e) {
                $fail++;
                $results[] = [
                    'index' => $idx,
                    'success' => false,
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => $isDummy ? 'Bulk import dummy selesai' : 'Bulk import selesai',
            'summary' => [
                'total' => count($rows),
                'success' => $ok,
                'failed' => $fail,
                'dummy' => $isDummy,
            ],
            'results' => $results,
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
            'nama_pengirim' => 'nullable|string|max:255',
            'no_rek_pengirim' => 'nullable|string|max:64',
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
        $orderPayment->nama_pengirim = $request->input('nama_pengirim');
        $orderPayment->no_rek_pengirim = $request->input('no_rek_pengirim');
        $orderPayment->save();

        $order->update([         
            'update_at' => now(),
            'status_pembayaran' => '1',
            'status_order' => '1'
        ]);

        // Catatan: promote ke 'customer' baru terjadi saat finance approve (status_pembayaran='2')
        // bukan saat konfirmasi awal (status_pembayaran='1' = menunggu validasi)

        try {
            $customer = Customer::find($order->customer);
            $produk = Produk::find($order->produk);

            $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                ->where('type', '6')
                ->first();

            // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
            $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

            if ($customer && $customer->wa && $autoSendEnabled) {
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

                // Ambil woowa_key dari sales yang terkait dengan customer
                $woowaKey = $this->getWoowaKeyFromSales($customer);

                $waSender = app(\App\Services\WhatsAppSenderService::class);
                $salesId = $customer->sales_id ?? null;
                $response = $waSender->sendMessage($customer->wa, $message, $salesId, $woowaKey);

                $this->logFollowupMessage(
                    $templateFollup,
                    $customer,
                    $message,
                    $response->successful(),
                    $response->json(),
                    $order->id
                );
            }
        } catch (\Exception $e) {
            $this->logFollowupMessage(
                $templateFollup ?? null,
                $customer ?? null,
                $message ?? '',
                false,
                ['error' => $e->getMessage()],
                $order->id ?? null
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

    /** Order aktif: bukan batal (N) dan bukan reject (status_order 3). */
    private function findActiveOrderForCustomerProduct(int $customerId, int $produkId): ?OrderCustomer
    {
        return OrderCustomer::where('customer', $customerId)
            ->where('produk', $produkId)
            ->where('status', '!=', 'N')
            ->where('status_order', '!=', '3')
            ->first();
    }

    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Jika dimulai dengan 6208, ganti jadi 628
        if (substr($phone, 0, 4) === '6208') {
            $phone = '628' . substr($phone, 4);
        }
        // Jika dimulai dengan 08, ganti jadi 628
        elseif (substr($phone, 0, 2) === '08') {
            $phone = '628' . substr($phone, 2);
        } elseif (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    private function logFollowupMessage(?TemplateFollup $template, ?Customer $customer, string $message, bool $success, $response = null, $orderId = null, $type = null): void
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
            'order' => $orderId,
            'type' => $type,
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
     * Format: 2025010100001 (tahun, bulan, tanggal, no urut random)
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
        
        // Generate random sequence (5 digit: 00001-99999)
        $maxAttempts = 100; // Maksimal percobaan untuk menghindari infinite loop
        $attempts = 0;
        
        do {
            // Generate random number antara 1-99999
            $randomSequence = rand(1, 99999);
            $sequence = str_pad($randomSequence, 5, '0', STR_PAD_LEFT);
            
            // Gabungkan: YYYYMMDD + random sequence
            $memberID = $datePart . $sequence;
            
            // Cek apakah memberID sudah ada
            $exists = Customer::where('memberID', $memberID)
                ->where('id', '!=', $customer->id ?? null)
                ->exists();
            
            $attempts++;
            
            // Jika sudah mencoba terlalu banyak, gunakan timestamp sebagai fallback
            if ($attempts >= $maxAttempts) {
                $sequence = str_pad(substr(time(), -5), 5, '0', STR_PAD_LEFT);
                $memberID = $datePart . $sequence;
                break;
            }
        } while ($exists);
        
        return $memberID;
    }

    private function getNextSalesId(?int $produkId = null): ?int
    {
        return app(SalesRoundRobinService::class)->getNextSalesId($produkId);
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer
     * Jika tidak ditemukan, fallback ke SalesSetting::getWoowaUtama()
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return \App\Models\SalesSetting::getWoowaUtama();
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();
        
        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        // Fallback jika tidak ditemukan
        return \App\Models\SalesSetting::getWoowaUtama();
    }

    /**
     * Ambil order untuk sales berdasarkan sales_id
     */
    public function ordersForSales(Request $request)
    {
        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;
        
        if (!$user || $user->divisi != '3' || $user->level != '2') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Ambil order berdasarkan sales_id melalui customer
        $query = OrderCustomer::with([
            'produk_rel:id,nama,fee_trainer',
            'customer_rel:id,nama,email,wa,pendapatan_bln',
        ])
        ->whereHas('customer_rel', function($q) use ($user) {
            $q->where('sales_id', $user->id)
              ->where('status', '!=', 'N');
        })
        ->where('status', '!=', 'N');

        // Filter berdasarkan search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->whereHas('customer_rel', function($customerQuery) use ($search) {
                    $customerQuery->where('nama', 'like', '%' . $search . '%')
                                 ->orWhere('email', 'like', '%' . $search . '%')
                                 ->orWhere('wa', 'like', '%' . $search . '%');
                })
                ->orWhereHas('produk_rel', function($produkQuery) use ($search) {
                    $produkQuery->where('nama', 'like', '%' . $search . '%');
                });
            });
        }

        // Filter Tanggal - Menggunakan field 'tanggal' (varchar)
        if ($request->has('tanggal_from') && $request->has('tanggal_to')) {
            // Postgres logic for varchar substring
            $query->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 10) BETWEEN ? AND ?", [
                $request->tanggal_from, 
                $request->tanggal_to
            ]);
        }

        // Filter berdasarkan status_order
        if ($request->has('status') && $request->status) {
            $query->where('status_order', $request->status);
        }

        // Filter berdasarkan status_pembayaran
        if ($request->has('status_pembayaran') && $request->status_pembayaran !== '') {
            $query->where('status_pembayaran', $request->status_pembayaran);
        }

        // Filter berdasarkan Produk ID
        $pIds = $request->input('produk_id') ?? $request->input('product_id') ?? $request->input('produk_id[]') ?? $request->input('product_id[]');
        if ($pIds) {
            $produks = is_array($pIds) ? $pIds : [$pIds];
            $produks = array_filter($produks, fn($val) => !is_null($val) && $val !== '' && $val !== 'undefined');
            if (!empty($produks)) {
                $query->where(function($q) use ($produks) {
                    $q->whereIn('produk', $produks)
                      ->orWhereIn('bundling', $produks);
                });
            }
        }

        $this->applyUtmColumnFilters($query, $request);

        $perPage = $request->get('per_page', 15);
        $orders = $query->orderBy('create_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ]
        ]);
    }

    /**
     * Daftar nilai unik per kolom UTM untuk filter (scope sama seperti daftar order).
     */
    public function utmFilterOptions(Request $request)
    {
        $userLogin = auth('api')->user();
        if (! $userLogin) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $userLogin->load('userData');
        $user = $userLogin->userData;
        $isStaffSales = $user && (string) $user->divisi === '3' && (string) $user->level === '2';

        $columns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        $out = [];

        foreach ($columns as $col) {
            $q = OrderCustomer::query()
                ->where('status', '!=', 'N')
                ->whereNotNull($col)
                ->where($col, '!=', '');

            if ($isStaffSales) {
                $q->whereHas('customer_rel', function ($sub) use ($user) {
                    $sub->where('sales_id', $user->id)
                        ->where('status', '!=', 'N');
                });
            }

            $out[$col] = $q->select($col)
                ->distinct()
                ->orderBy($col)
                ->limit(150)
                ->pluck($col)
                ->values()
                ->all();
        }

        return response()->json([
            'success' => true,
            'data' => $out,
        ]);
    }

    /**
     * Filter whereIn per kolom UTM (request: utm_source[]=a&utm_source[]=b, dst).
     */
    private function applyUtmColumnFilters($query, Request $request): void
    {
        $columns = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
        foreach ($columns as $col) {
            $values = $request->input($col);
            if ($values === null || $values === '') {
                continue;
            }
            if (! is_array($values)) {
                $values = [$values];
            }
            $values = array_values(array_unique(array_filter(array_map(function ($v) {
                return is_string($v) ? trim($v) : (string) $v;
            }, $values), function ($s) {
                return $s !== '';
            })));
            if (count($values) > 0) {
                $query->whereIn($col, $values);
            }
        }
    }

    /**
     * Broadcast pesan WhatsApp untuk multiple orders
     */
    public function broadcastOrders(Request $request)
    {
        $validator = \Validator::make($request->all(), [
            'message' => 'required|string',
            'status_order' => 'nullable|string',
            'status_pembayaran' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;
        
        if (!$user || $user->divisi != '3' || $user->level != '2') {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 403);
        }

        // Ambil order berdasarkan sales_id
        $query = OrderCustomer::with('customer_rel')
            ->whereHas('customer_rel', function($q) use ($user) {
                $q->where('sales_id', $user->id)
                  ->where('status', '!=', 'N');
            })
            ->where('status', '!=', 'N')
            ->whereHas('customer_rel', function($q) {
                $q->whereNotNull('wa')
                  ->where('wa', '!=', '');
            });

        if ($request->has('status_order') && $request->status_order !== null && $request->status_order !== '') {
            $query->where('status_order', $request->status_order);
        }

        if ($request->has('status_pembayaran') && $request->status_pembayaran !== null && $request->status_pembayaran !== '') {
            $query->where('status_pembayaran', $request->status_pembayaran);
        }

        $orders = $query->get();

        if ($orders->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada order yang sesuai dengan filter atau customer tidak memiliki nomor WhatsApp'
            ], 404);
        }

        $sentCount = 0;
        $failedCount = 0;

        foreach ($orders as $order) {
            if (!$order->customer_rel || !$order->customer_rel->wa) {
                $failedCount++;
                continue;
            }

            try {
                $woowaKey = $this->getWoowaKeyFromSales($order->customer_rel);

                $waSender = app(\App\Services\WhatsAppSenderService::class);
                $salesId = $order->customer_rel->sales_id ?? null;
                $response = $waSender->sendMessage($order->customer_rel->wa, $request->message, $salesId, $woowaKey);

                if ($response->successful()) {
                    $sentCount++;
                } else {
                    $failedCount++;
                }
            } catch (\Exception $e) {
                \Log::error('Gagal kirim broadcast order', [
                    'order_id' => $order->id,
                    'error' => $e->getMessage()
                ]);
                $failedCount++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Broadcast selesai',
            'data' => [
                'total_orders' => $orders->count(),
                'sent' => $sentCount,
                'failed' => $failedCount
            ]
        ]);
    }

    /**
     * Send WhatsApp from Order
     */
    public function sendWhatsApp(Request $request, $orderId)
    {
        // Log request
        \Log::info('Send WhatsApp Request', [
            'order_id' => $orderId,
            'user_id' => Auth::id(),
            'request_data' => [
                'message' => $request->message,
                'all_request' => $request->all()
            ]
        ]);

        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
        ]);

        if ($validator->fails()) {
            \Log::error('Send WhatsApp - Validasi gagal', [
                'order_id' => $orderId,
                'user_id' => Auth::id(),
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $order = OrderCustomer::with('customer_rel')->find($orderId);

        if (!$order) {
            \Log::error('Send WhatsApp - Order tidak ditemukan', [
                'order_id' => $orderId,
                'user_id' => Auth::id()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        if (!$order->customer_rel || !$order->customer_rel->wa) {
            \Log::error('Send WhatsApp - Customer tidak memiliki nomor WhatsApp', [
                'order_id' => $orderId,
                'user_id' => Auth::id(),
                'customer_id' => $order->customer_rel->id ?? null,
                'customer_wa' => $order->customer_rel->wa ?? null
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak memiliki nomor WhatsApp'
            ], 400);
        }

        $woowaKey = $this->getWoowaKeyFromSales($order->customer_rel);
        
        if (!$woowaKey) {
            \Log::error('Send WhatsApp - Konfigurasi WhatsApp tidak ditemukan', [
                'order_id' => $orderId,
                'user_id' => Auth::id(),
                'customer_id' => $order->customer_rel->id ?? null,
                'sales_id' => $order->customer_rel->sales_id ?? null
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Konfigurasi WhatsApp tidak ditemukan'
            ], 500);
        }

        try {
            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $salesId = $order->customer_rel->sales_id ?? null;
            $response = $waSender->sendMessage($order->customer_rel->wa, $request->message, $salesId, $woowaKey);

            if ($response->successful()) {
                // Create follow up order
                $userId = Auth::id();
                
                try {
                    \App\Models\FollowUpOrder::create([
                        'order_id' => $order->id,
                        'follow_up_date' => now()->format('Y-m-d H:i:s'),
                        'channel' => 'WhatsApp',
                        'note' => $request->message,
                        'type' => 'whatsapp_out',
                        'status' => '1',
                        'create_by' => $userId,
                        'create_at' => now()->format('Y-m-d H:i:s'),
                    ]);
                } catch (\Exception $e) {
                    \Log::error('Send WhatsApp - Error saat create FollowUpOrder', [
                        'order_id' => $orderId,
                        'user_id' => $userId,
                        'error' => $e->getMessage(),
                        'trace' => $e->getTraceAsString()
                    ]);
                }

                \Log::info('Send WhatsApp - Berhasil dikirim', [
                    'order_id' => $orderId,
                    'user_id' => $userId,
                    'customer_wa' => $order->customer_rel->wa,
                    'response' => $response->json()
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Pesan WhatsApp berhasil dikirim',
                    'data' => $response->json()
                ]);
            } else {
                \Log::error('Send WhatsApp - Gagal mengirim pesan (HTTP Error)', [
                    'order_id' => $orderId,
                    'user_id' => Auth::id(),
                    'woowa_key' => $woowaKey,
                    'customer_wa' => $order->customer_rel->wa,
                    'http_status' => $response->status(),
                    'response' => $response->json()
                ]);
                
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal mengirim pesan WhatsApp',
                    'error' => $response->json()
                ], $response->status());
            }
        } catch (\Exception $e) {
            \Log::error('Send WhatsApp - Exception terjadi', [
                'order_id' => $orderId,
                'user_id' => Auth::id(),
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Customer upload bukti pembayaran
     */
    public function customerUploadBuktiPembayaran(Request $request, $id)
    {
        // Log request
        \Log::info('Customer Upload Bukti Pembayaran Request', [
            'order_id' => $id,
            'customer_id' => auth('customer')->id(),
            'request_data' => $request->except(['bukti_pembayaran']) // Exclude file dari log
        ]);

        // Validasi customer sudah login
        $customer = auth('customer')->user();
        if (!$customer) {
            \Log::error('Customer Upload Bukti - Customer tidak terautentikasi', [
                'order_id' => $id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Silakan login terlebih dahulu.'
            ], 401);
        }

        // Validasi input
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'waktu_pembayaran' => 'required|date',
            'bukti_pembayaran' => 'required|image|mimes:jpg,jpeg,png|max:2048',
            'metode_pembayaran' => 'required|string',
        ]);

        if ($validator->fails()) {
            \Log::error('Customer Upload Bukti - Validasi gagal', [
                'order_id' => $id,
                'customer_id' => $customer->id,
                'errors' => $validator->errors()->toArray()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cari order
        $order = OrderCustomer::with('customer_rel')->find($id);
        
        if (!$order) {
            \Log::error('Customer Upload Bukti - Order tidak ditemukan', [
                'order_id' => $id,
                'customer_id' => $customer->id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Order tidak ditemukan'
            ], 404);
        }

        // Validasi order milik customer yang login
        if ($order->customer != $customer->id) {
            \Log::error('Customer Upload Bukti - Order bukan milik customer', [
                'order_id' => $id,
                'customer_id' => $customer->id,
                'order_customer_id' => $order->customer
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Order ini bukan milik Anda'
            ], 403);
        }

        // Validasi status order
        if ($order->status == 'N') {
            \Log::error('Customer Upload Bukti - Order sudah dihapus', [
                'order_id' => $id,
                'customer_id' => $customer->id
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Order tidak valid'
            ], 400);
        }

        try {
            // Upload file bukti pembayaran
            $buktiPath = $request->file('bukti_pembayaran')->store('order/bukti', 'public');

            // Hitung payment_ke
            $payment_ke = OrderPayment::where('order_id', $id)->max('payment_ke');
            $payment_ke = $payment_ke ? $payment_ke + 1 : 1;

            // Buat OrderPayment record
            $orderPayment = new OrderPayment();
            $orderPayment->order_id = $id;
            $orderPayment->amount = $request->amount;
            $orderPayment->tanggal = $request->waktu_pembayaran;
            $orderPayment->bukti_pembayaran = $buktiPath;
            $orderPayment->payment_method = $request->metode_pembayaran;
            $orderPayment->payment_type = '1';
            $orderPayment->payment_ke = $payment_ke;
            $orderPayment->create_at = now();
            $orderPayment->status = '1'; // Status menunggu validasi
            $orderPayment->save();

            // Update status pembayaran order menjadi menunggu validasi
            $order->update([
                'update_at' => now(),
                'status_pembayaran' => '1' // Menunggu validasi
            ]);

            // Kirim notifikasi WhatsApp (opsional)
            try {
                \Log::info('Customer Upload Bukti - Mulai proses kirim WhatsApp', [
                    'order_id' => $order->id,
                    'customer_id' => $order->customer,
                    'produk_id' => $order->produk,
                ]);

                $customerData = Customer::find($order->customer);
                
                \Log::info('Customer Upload Bukti - Data customer', [
                    'order_id' => $order->id,
                    'customer_id' => $order->customer,
                    'customer_found' => $customerData ? true : false,
                    'customer_wa' => $customerData ? $customerData->wa : null,
                    'customer_sales_id' => $customerData ? $customerData->sales_id : null,
                ]);

                if (!$customerData) {
                    \Log::warning('Customer Upload Bukti - Customer tidak ditemukan untuk kirim WhatsApp', [
                        'order_id' => $order->id,
                        'customer_id' => $order->customer,
                    ]);
                } elseif (!$customerData->wa) {
                    \Log::warning('Customer Upload Bukti - Customer tidak memiliki nomor WA', [
                        'order_id' => $order->id,
                        'customer_id' => $order->customer,
                        'customer_nama' => $customerData->nama,
                    ]);
                } else {
                    $produk = Produk::find($order->produk);
                    
                    \Log::info('Customer Upload Bukti - Data produk', [
                        'order_id' => $order->id,
                        'produk_id' => $order->produk,
                        'produk_found' => $produk ? true : false,
                        'produk_nama' => $produk ? $produk->nama : null,
                    ]);

                    $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                        ->where('type', '6')
                        ->first();

                    // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
                    $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

                    \Log::info('Customer Upload Bukti - Template followup', [
                        'order_id' => $order->id,
                        'produk_id' => $order->produk,
                        'template_found' => $templateFollup ? true : false,
                        'template_id' => $templateFollup ? $templateFollup->id : null,
                        'template_nama' => $templateFollup ? $templateFollup->nama : null,
                        'auto_send_enabled' => $autoSendEnabled,
                    ]);

                    $dataText = [
                        'customer_name' => $customerData->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                        'order_total'   => number_format($order->total_harga ?? 0, 0, ',', '.'),
                        'payment_method'=> $request->metode_pembayaran,
                        'payment_time'  => $request->waktu_pembayaran,
                        'payment_ke'    => $payment_ke,
                        'amount'        => $request->amount,
                        'amount_total'  => $order->total_harga ?? 0,
                        'amount_remaining' => max(0, ($order->total_harga ?? 0) - $request->amount),
                        'amount_remaining_formatted' => number_format(max(0, ($order->total_harga ?? 0) - $request->amount), 0, ',', '.'),
                    ];

                    $message = $templateFollup
                        ? TemplateHelper::render($templateFollup->text, $dataText)
                        : "Halo {$customerData->nama}, pembayaran untuk {$produk->nama} telah kami terima dan sedang dalam proses validasi. Terima kasih 🙏";

                    \Log::info('Customer Upload Bukti - Pesan WhatsApp', [
                        'order_id' => $order->id,
                        'message_length' => strlen($message),
                        'message_preview' => substr($message, 0, 100),
                    ]);

                    $woowaKey = $this->getWoowaKeyFromSales($customerData);

                    \Log::info('Customer Upload Bukti - Woowa Key', [
                        'order_id' => $order->id,
                        'customer_id' => $order->customer,
                        'customer_sales_id' => $customerData->sales_id,
                        'woowa_key_found' => $woowaKey ? true : false,
                        'woowa_key_length' => $woowaKey ? strlen($woowaKey) : 0,
                    ]);

                    if (!$autoSendEnabled) {
                        \Log::info('Customer Upload Bukti - Auto send Processing dimatikan, WA tidak dikirim', [
                            'order_id' => $order->id,
                        ]);
                    } elseif (!$woowaKey) {
                        \Log::error('Customer Upload Bukti - Woowa Key tidak ditemukan', [
                            'order_id' => $order->id,
                            'customer_id' => $order->customer,
                            'customer_sales_id' => $customerData->sales_id,
                        ]);
                    } else {
                        \Log::info('Customer Upload Bukti - Mengirim request ke WhatsApp API', [
                            'order_id' => $order->id,
                            'phone_no' => $customerData->wa,
                            'api_url' => 'https://notifapi.com/send_message',
                        ]);

                        $waSender = app(\App\Services\WhatsAppSenderService::class);
                        $salesId = $customerData->sales_id ?? null;
                        $response = $waSender->sendMessage($customerData->wa, $message, $salesId, $woowaKey);

                        \Log::info('Customer Upload Bukti - Response WhatsApp API', [
                            'order_id' => $order->id,
                            'http_status' => $response->status(),
                            'successful' => $response->successful(),
                            'response_body' => $response->json(),
                            'response_raw' => $response->body(),
                        ]);

                        $this->logFollowupMessage(
                            $templateFollup,
                            $customerData,
                            $message,
                            $response->successful(),
                            $response->json(),
                            $order->id,
                            'upload Pembayaran'
                        );

                        if ($response->successful()) {
                            \Log::info('Customer Upload Bukti - WhatsApp berhasil dikirim', [
                                'order_id' => $order->id,
                                'customer_id' => $order->customer,
                                'customer_wa' => $customerData->wa,
                            ]);
                        } else {
                            \Log::error('Customer Upload Bukti - WhatsApp gagal dikirim', [
                                'order_id' => $order->id,
                                'customer_id' => $order->customer,
                                'customer_wa' => $customerData->wa,
                                'http_status' => $response->status(),
                                'response' => $response->json(),
                            ]);
                        }
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Customer Upload Bukti - Exception saat kirim WhatsApp', [
                    'order_id' => $order->id,
                    'customer_id' => $order->customer,
                    'error_message' => $e->getMessage(),
                    'error_file' => $e->getFile(),
                    'error_line' => $e->getLine(),
                    'error_trace' => $e->getTraceAsString(),
                ]);
            }

            \Log::info('Customer Upload Bukti - Berhasil', [
                'order_id' => $id,
                'customer_id' => $customer->id,
                'payment_id' => $orderPayment->id,
                'amount' => $request->amount,
                'payment_ke' => $payment_ke
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Bukti pembayaran berhasil diupload. Pembayaran sedang dalam proses validasi.',
                'data' => [
                    'order' => $order,
                    'payment' => $orderPayment
                ]
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Customer Upload Bukti - Exception terjadi', [
                'order_id' => $id,
                'customer_id' => $customer->id,
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengupload bukti pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }
    public function publicShowOrder($id)
    {
        $order = OrderCustomer::with([
            'customer_rel:id,nama,email,wa,alamat,provinsi,kabupaten,kecamatan,kode_pos',
            'produk_rel:id,nama,landingpage,assign,fb_pixel',
            'order_payment_rel:id,order_id,amount,status,payment_method,payment_type,payment_ke,tanggal,bukti_pembayaran,nama_pengirim,no_rek_pengirim,create_at',
        ])->where(function ($query) use ($id) {
            $query->where('kode_order', $id)
                  ->orWhere('id', $id);
        })->first();

        if (!$order || $order->status == 'N') {
            return response()->json(['success' => false, 'message' => 'Order tidak ditemukan atau tidak valid'], 404);
        }

        if ($order->produk_rel) {
            // Sumber pixel sama seperti ProdukController@show: relasi ke pixel_meta via kolom fb_pixel
            $fbPixelIds = is_string($order->produk_rel->fb_pixel) ? json_decode($order->produk_rel->fb_pixel, true) : $order->produk_rel->fb_pixel;
            if (!is_array($fbPixelIds)) {
                $fbPixelIds = [];
            }

            $validIds = array_filter($fbPixelIds, function ($val) {
                return is_numeric($val) && $val <= 2147483647;
            });

            $pixels = \App\Models\PixelMeta::whereIn('pixel', $fbPixelIds)
                ->when(!empty($validIds), function ($query) use ($validIds) {
                    return $query->orWhereIn('id', $validIds);
                })->get();

            $order->produk_rel->pixel_list = $pixels;
            unset($order->produk_rel->landingpage);
        }

        // === Ambil no_wa Sales PIC dari assign produk ===
        $salesPicWa = null;
        $salesPicNama = null;
        try {
            $produkId = $order->produk;
            if ($produkId) {
                // Ambil raw assign dari database
                $rawAssign = \App\Models\Produk::where('id', $produkId)->value('assign');
                $assignArray = [];
                if (is_string($rawAssign)) {
                    $decoded = json_decode($rawAssign, true);
                    if (is_string($decoded)) {
                        $decoded = json_decode($decoded, true);
                    }
                    if (is_array($decoded)) {
                        $assignArray = $decoded;
                    }
                } elseif (is_array($rawAssign)) {
                    $assignArray = $rawAssign;
                }

                // Ambil user_id pertama dari assign
                $firstUserId = !empty($assignArray) ? (int) $assignArray[0] : null;
                if ($firstUserId) {
                    // Cari no_wa dari tabel sales berdasarkan user_id
                    $salesRecord = \App\Models\Sales::where('user_id', $firstUserId)
                        ->select('no_wa', 'user_id')
                        ->first();
                    if ($salesRecord && $salesRecord->no_wa) {
                        $salesPicWa = $salesRecord->no_wa;
                    }

                    // Ambil nama sales PIC
                    $userSales = \App\Models\User::where('id', $firstUserId)->value('nama');
                    $salesPicNama = $userSales;
                }
            }
        } catch (\Exception $e) {
            \Log::warning('publicShowOrder - Gagal ambil sales_pic_wa: ' . $e->getMessage());
        }

        // === Ambil Template Follow-up untuk Payment ===
        $templateFollupPayment = null;
        try {
            if ($order->produk) {
                // Ambil template follup redirect atau type 9 (hanya yang "Enable Auto Send" aktif)
                $template = \App\Models\TemplateFollup::where('produk_id', $order->produk)
                    ->where('status', '1')
                    ->where(function ($q) {
                        $q->where('type', '9')
                          ->orWhere('type', 'redirect')
                          ->orWhere('type', 'template_follup_redirect');
                    })
                    ->first();

                if ($template) {
                    $templateFollupPayment = [
                        'id'   => $template->id,
                        'nama' => $template->nama,
                        'text' => $template->text,
                        'type' => $template->type,
                    ];
                }
            }
        } catch (\Exception $e) {
            \Log::warning('publicShowOrder - Gagal ambil template_follup_payment: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'data' => $order,
            'sales_pic_wa'            => $salesPicWa,
            'sales_pic_nama'          => $salesPicNama,
            'template_follup_payment' => $templateFollupPayment,
        ]);
    }

    public function publicUploadBuktiPembayaran(Request $request, $id)
    {
        // Validasi input
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1',
            'waktu_pembayaran' => 'required|date',
            'bukti_pembayaran' => 'required|image|mimes:jpg,jpeg,png|max:4048',
            'metode_pembayaran' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cari order
        $order = OrderCustomer::with('customer_rel')->where('kode_order', $id)->first();
        if (!$order || $order->status == 'N') {
            return response()->json(['success' => false, 'message' => 'Order tidak ditemukan'], 404);
        }

        try {
            // Upload file bukti pembayaran
            $buktiPath = $request->file('bukti_pembayaran')->store('order/bukti', 'public');

            // Hitung payment_ke
            $payment_ke = OrderPayment::where('order_id', $order->id)->max('payment_ke');
            $payment_ke = $payment_ke ? $payment_ke + 1 : 1;

            // Buat OrderPayment record
            $orderPayment = new OrderPayment();
            $orderPayment->order_id = $order->id;
            $orderPayment->amount = $request->amount;
            $orderPayment->tanggal = $request->waktu_pembayaran;
            $orderPayment->bukti_pembayaran = $buktiPath;
            $orderPayment->payment_method = $request->metode_pembayaran;
            $orderPayment->payment_type = '1';
            $orderPayment->payment_ke = $payment_ke;
            $orderPayment->create_at = now();
            $orderPayment->status = '1'; // Status menunggu validasi
            $orderPayment->save();

            // Update status pembayaran order menjadi menunggu validasi
            $order->update([
                'update_at' => now(),
                'status_pembayaran' => '1' // Menunggu validasi
            ]);

            // Kirim notifikasi WhatsApp (opsional)
            try {
                $customerData = Customer::find($order->customer);
                if ($customerData && $customerData->wa) {
                    $produk = Produk::find($order->produk);
                    
                    $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                        ->where('type', '6')
                        ->first();

                    // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
                    $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

                    $dataText = [
                        'customer_name' => $customerData->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                        'order_total'   => number_format($order->total_harga ?? 0, 0, ',', '.'),
                        'payment_method'=> $request->metode_pembayaran,
                        'payment_time'  => $request->waktu_pembayaran,
                        'payment_ke'    => $payment_ke,
                        'amount'        => $request->amount,
                        'amount_total'  => $order->total_harga ?? 0,
                        'amount_remaining' => max(0, ($order->total_harga ?? 0) - $request->amount),
                        'amount_remaining_formatted' => number_format(max(0, ($order->total_harga ?? 0) - $request->amount), 0, ',', '.'),
                    ];

                    $message = $templateFollup
                        ? TemplateHelper::render($templateFollup->text, $dataText)
                        : "Halo {$customerData->nama}, pembayaran untuk {$produk->nama} telah kami terima dan sedang dalam proses validasi. Terima kasih 🙏";

                    $woowaKey = $this->getWoowaKeyFromSales($customerData);

                    if ($woowaKey && $autoSendEnabled) {
                        $waSender = app(\App\Services\WhatsAppSenderService::class);
                        $salesId = $customerData->sales_id ?? null;
                        $response = $waSender->sendMessage($customerData->wa, $message, $salesId, $woowaKey);

                        $this->logFollowupMessage(
                            $templateFollup,
                            $customerData,
                            $message,
                            $response->successful(),
                            $response->json(),
                            $order->id,
                            'upload Pembayaran'
                        );
                    }
                }
            } catch (\Exception $e) {
                \Log::error('Public Upload Bukti - Exception saat kirim WhatsApp: ' . $e->getMessage());
            }

            return response()->json([
                'success' => true,
                'message' => 'Bukti pembayaran berhasil diupload. Pembayaran sedang dalam proses validasi.',
                'data' => [
                    'order' => $order,
                    'payment' => $orderPayment
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mengupload bukti pembayaran: ' . $e->getMessage()
            ], 500);
        }
    }
}
