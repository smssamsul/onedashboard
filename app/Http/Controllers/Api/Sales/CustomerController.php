<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Sales;
use App\Models\Produk;
use Carbon\Carbon;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\OrderCustomer;
use App\Models\OrderCustomerArsip;
use App\Models\LogsFollup;
use App\Services\SalesRoundRobinService;
use App\Models\CustomerFollowup;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Cell\Cell;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class CustomerController extends Controller
{
    /**
     * Static variable untuk tracking memberID yang sudah digunakan dalam batch import
     */
    private static $usedMemberIDs = [];

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = Customer::select(array_diff(
            \Schema::getColumnListing('customer'),
            ['password'] 
        ))
        ->where('status', '!=', 'N');

        // Search berdasarkan nama, email, WA, atau memberID
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('wa', 'ILIKE', "%{$search}%")
                  ->orWhere('nama_panggilan', 'ILIKE', "%{$search}%")
                  ->orWhere('memberID', 'ILIKE', "%{$search}%")
                  ->orWhere('alamat', 'ILIKE', "%{$search}%");
            });
        }

        // Filter berdasarkan memberID
        if ($request->has('memberID') && $request->memberID) {
            $query->where('memberID', 'ILIKE', "%{$request->memberID}%");
        }

        // Filter berdasarkan keanggotaan (mendukung multi-tier, e.g., platinum,gold,silver)
        if ($request->has('keanggotaan') && $request->keanggotaan) {
            if (is_string($request->keanggotaan) && str_contains($request->keanggotaan, ',')) {
                $tiers = array_map('trim', explode(',', $request->keanggotaan));
                $query->whereIn('keanggotaan', $tiers);
            } else {
                $query->where('keanggotaan', $request->keanggotaan);
            }
        }

        // Filter berdasarkan alamat
        if ($request->has('alamat') && $request->alamat) {
            $query->where('alamat', 'ILIKE', "%{$request->alamat}%");
        }

        // Filter berdasarkan tahun (create_at)
        if ($request->has('tahun') && $request->tahun) {
            $query->whereYear('create_at', $request->tahun);
        }

        // Filter berdasarkan customer_type (lead / customer)
        if ($request->has('customer_type') && $request->customer_type) {
            $query->where('customer_type', $request->customer_type);
        }

        // Filter berdasarkan score_label (hot / warm / cold / frozen)
        if ($request->has('score_label') && $request->score_label) {
            $query->where('score_label', $request->score_label);
        }

        // Urutkan berdasarkan tahun (create_at) terlebih dahulu, kemudian id
        $query->orderBy('create_at', 'desc')->orderBy('id', 'desc');

        // Jika parameter all=true, return semua data tanpa pagination
        if ($request->has('all') && $request->all == 'true') {
            $customers = $query->with('sales_rel:id,nama')->get();
            
            // Tambahkan sales_nama ke setiap customer
            $customers->each(function($customer) {
                $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;
            });
            
            // Summary statistics (sesuai filter)
            $summary = [
                'total' => $customers->count(),
                'verified' => (clone $query)->reorder()->where('verifikasi', '1')->count(),
                'unverified' => (clone $query)->reorder()->where(function($q) {
                    $q->whereNull('verifikasi')->orWhere('verifikasi', '!=', '1');
                })->count(),
                'membership' => (clone $query)->reorder()
                    ->select('keanggotaan', \DB::raw('count(*) as total'))
                    ->groupBy('keanggotaan')
                    ->pluck('total', 'keanggotaan')
                    ->toArray()
            ];

            return response()->json([
                'success' => true,
                'data' => $customers,
                'total' => $customers->count(),
                'summary' => $summary
            ]);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $customers = $query->with('sales_rel:id,nama')->paginate($perPage);

        // Tambahkan sales_nama ke setiap customer
        $customers->getCollection()->each(function($customer) {
            $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;
        });

        // Summary statistics (sesuai filter)
        $summary = [
            'total' => $customers->total(),
            'verified' => (clone $query)->reorder()->where('verifikasi', '1')->count(),
            'unverified' => (clone $query)->reorder()->where(function($q) {
                $q->whereNull('verifikasi')->orWhere('verifikasi', '!=', '1');
            })->count(),
            'membership' => (clone $query)->reorder()
                ->select('keanggotaan', \DB::raw('count(*) as total'))
                ->groupBy('keanggotaan')
                ->pluck('total', 'keanggotaan')
                ->toArray()
        ];

        return response()->json([
            'success' => true,
            'data' => $customers->items(),
            'pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page' => $customers->lastPage(),
                'per_page' => $customers->perPage(),
                'total' => $customers->total(),
            ],
            'summary' => $summary
        ]);
    }

    public function statistics(Request $request)
    {
        $tahun = $request->get('tahun', 'all');

        // 0. Auto-healing / Self-completeness check for Customer data (Max 100 rows per load to ensure high performance)
        try {
            $incompleteCustomers = Customer::where(function($q) {
                $q->whereNull('memberID')
                  ->orWhere('memberID', '')
                  ->orWhereNull('keanggotaan')
                  ->orWhere('keanggotaan', '');
            })
            ->where('status', '!=', 'N')
            ->limit(100)
            ->get();

            foreach ($incompleteCustomers as $customer) {
                $update = [];
                if (empty($customer->memberID)) {
                    $createAt = $customer->create_at ?? now();
                    if (is_string($createAt)) {
                        $createAt = \Carbon\Carbon::parse($createAt);
                    }
                    $datePart = $createAt->format('Ymd');
                    $randomSequence = random_int(10000, 99999);
                    $update['memberID'] = $datePart . $randomSequence;
                }
                if (empty($customer->keanggotaan)) {
                    $update['keanggotaan'] = 'basic';
                }
                if (!empty($update)) {
                    $customer->update($update);
                }
            }

            // Normalisasi nomor WA yang tidak valid
            $unformattedWaCustomers = Customer::where('status', '!=', 'N')
                ->whereNotNull('wa')
                ->where('wa', '!=', '')
                ->where('wa', 'NOT LIKE', '62%')
                ->limit(100)
                ->get();

            foreach ($unformattedWaCustomers as $customer) {
                $formatted = $this->formatPhoneNumber($customer->wa);
                if ($formatted !== $customer->wa) {
                    $customer->update(['wa' => $formatted]);
                }
            }
        } catch (\Throwable $e) {
            // Silently log or ignore to make sure page remains reliable
        }

        // 1. Dynamic list of years from order_customer_arsip
        $availableYears = [];
        try {
            $availableYears = OrderCustomerArsip::selectRaw('DISTINCT EXTRACT(YEAR FROM tanggal) as year')
                ->whereNotNull('tanggal')
                ->orderBy('year', 'desc')
                ->pluck('year')
                ->map(function($y) { return (int) $y; })
                ->toArray();
        } catch (\Throwable $e) {}

        // 2. Customer Counts (Registered Cohort)
        $customerCountQuery = Customer::where('status', '!=', 'N');
        if ($tahun !== 'all') {
            $customerCountQuery->where('create_at', 'LIKE', $tahun . '%');
        }
        $totalData = $customerCountQuery->count();
        $totalLeads = (clone $customerCountQuery)->where('customer_type', 'lead')->count();
        $totalRealCustomers = (clone $customerCountQuery)->where('customer_type', 'customer')->count();

        // 3. Membership Breakdowns (from keanggotaan)
        $membershipQuery = Customer::where('status', '!=', 'N');
        if ($tahun !== 'all') {
            $membershipQuery->where('create_at', 'LIKE', $tahun . '%');
        }
        $rawMembership = $membershipQuery
            ->select('keanggotaan', \DB::raw('count(*) as total'))
            ->groupBy('keanggotaan')
            ->pluck('total', 'keanggotaan')
            ->toArray();

        // Normalize keys to lowercase and fill missing
        $rawMembership = array_change_key_case($rawMembership, CASE_LOWER);
        $membership = [
            'platinum' => $rawMembership['platinum'] ?? 0,
            'gold' => $rawMembership['gold'] ?? 0,
            'silver' => $rawMembership['silver'] ?? 0,
            'bronze' => $rawMembership['bronze'] ?? 0,
            'basic' => $rawMembership['basic'] ?? 0,
        ];

        // 4. Order Status (Paid and Unpaid counts + amounts) from order_customer_arsip
        $orderQuery = OrderCustomerArsip::query();
        if ($tahun !== 'all') {
            $orderQuery->whereYear('tanggal', $tahun);
        }

        $paidOrderQuery = (clone $orderQuery)->where('status_pembayaran', '2');
        $paidOrdersCount = $paidOrderQuery->count();
        $paidOrdersAmount = (float) $paidOrderQuery->sum(\DB::raw("COALESCE(NULLIF(regexp_replace(harga, '[^0-9.]', '', 'g'), ''), '0')::numeric"));

        $unpaidOrderQuery = (clone $orderQuery)->where('status_pembayaran', '!=', '2');
        $unpaidOrdersCount = $unpaidOrderQuery->count();
        $unpaidOrdersAmount = (float) $unpaidOrderQuery->sum(\DB::raw("COALESCE(NULLIF(regexp_replace(harga, '[^0-9.]', '', 'g'), ''), '0')::numeric"));

        // 5. Diagram Data: Top 10 products with the most PAID orders
        $productQuery = OrderCustomerArsip::where('status_pembayaran', '2')
            ->whereNotNull('produk_nama_manual')
            ->where('produk_nama_manual', '!=', '');
        
        if ($tahun !== 'all') {
            $productQuery->whereYear('tanggal', $tahun);
        }

        $topProducts = $productQuery
            ->select('produk_nama_manual', \DB::raw('count(*) as total_paid_orders'))
            ->groupBy('produk_nama_manual')
            ->orderBy('total_paid_orders', 'desc')
            ->limit(10)
            ->get()
            ->map(function($item) {
                return [
                    'produk_nama' => $item->produk_nama_manual,
                    'paid_orders_count' => (int) $item->total_paid_orders
                ];
            })
            ->toArray();

        // 6. Customer Spending Leaderboard
        $spendingQuery = OrderCustomerArsip::where('status_pembayaran', '2');
        if ($tahun !== 'all') {
            $spendingQuery->whereYear('tanggal', $tahun);
        }

        $topSpending = $spendingQuery
            ->select('customer_id', \DB::raw("SUM(COALESCE(NULLIF(regexp_replace(harga, '[^0-9.]', '', 'g'), ''), '0')::numeric) as total_spent"))
            ->groupBy('customer_id')
            ->orderBy('total_spent', 'desc')
            ->limit(10)
            ->get();

        $topCustomersData = [];
        foreach ($topSpending as $tc) {
            $cust = Customer::find($tc->customer_id);
            if ($cust) {
                $topCustomersData[] = [
                    'customer_id' => $tc->customer_id,
                    'nama' => $cust->nama,
                    'email' => $cust->email,
                    'wa' => $cust->wa,
                    'memberID' => $cust->memberID,
                    'keanggotaan' => $cust->keanggotaan ?: 'basic',
                    'total_spent' => (float)$tc->total_spent
                ];
            } else {
                $topCustomersData[] = [
                    'customer_id' => $tc->customer_id,
                    'nama' => 'Customer #' . $tc->customer_id,
                    'email' => '-',
                    'wa' => '-',
                    'memberID' => '-',
                    'keanggotaan' => 'basic',
                    'total_spent' => (float)$tc->total_spent
                ];
            }
        }

        // 7. Customer Growth & Retention (MoM)
        // Find very first paid order date for each customer in history to determine who is "New" vs "Repeat"
        $firstOrderDates = OrderCustomerArsip::where('status_pembayaran', '2')
            ->whereNotNull('tanggal')
            ->select('customer_id', \DB::raw('MIN(tanggal) as first_date'))
            ->groupBy('customer_id')
            ->pluck('first_date', 'customer_id')
            ->toArray();

        // Convert the string timestamps to Carbon objects or dates
        foreach ($firstOrderDates as $cid => $dateStr) {
            try {
                $firstOrderDates[$cid] = Carbon::parse($dateStr)->format('Y-m');
            } catch (\Throwable $e) {
                unset($firstOrderDates[$cid]);
            }
        }

        // Get all paid orders chronologically to group by month
        $allPaidOrders = OrderCustomerArsip::where('status_pembayaran', '2')
            ->whereNotNull('tanggal')
            ->orderBy('tanggal', 'asc')
            ->get();

        $monthlyData = []; // format: ['YYYY-MM' => ['new' => [], 'repeat' => []]]
        foreach ($allPaidOrders as $order) {
            try {
                $carbonDate = Carbon::parse($order->tanggal);
                $monthKey = $carbonDate->format('Y-m');
                $cid = $order->customer_id;

                if (!isset($monthlyData[$monthKey])) {
                    $monthlyData[$monthKey] = [
                        'new' => [],
                        'repeat' => []
                    ];
                }

                // If customer not yet processed in this month
                if (!in_array($cid, $monthlyData[$monthKey]['new']) && !in_array($cid, $monthlyData[$monthKey]['repeat'])) {
                    // Check if first paid order was in this month
                    $firstMonth = $firstOrderDates[$cid] ?? null;
                    if ($firstMonth === $monthKey) {
                        $monthlyData[$monthKey]['new'][] = $cid;
                    } else {
                        $monthlyData[$monthKey]['repeat'][] = $cid;
                    }
                }
            } catch (\Throwable $e) {
                continue;
            }
        }

        // Sort monthlyData keys chronologically
        ksort($monthlyData);

        $monthlyMetrics = [];
        $previousTotal = 0;

        foreach ($monthlyData as $mKey => $data) {
            $newCount = count($data['new']);
            $repeatCount = count($data['repeat']);
            $totalCount = $newCount + $repeatCount;

            $growth = 0;
            if ($previousTotal > 0) {
                $growth = (($totalCount - $previousTotal) / $previousTotal) * 100;
            }

            try {
                $monthName = Carbon::parse($mKey . '-01')->translatedFormat('F Y');
            } catch (\Throwable $e) {
                $monthName = $mKey;
            }

            $monthlyMetrics[$mKey] = [
                'month' => $mKey,
                'month_name' => $monthName,
                'new_count' => $newCount,
                'repeat_count' => $repeatCount,
                'total_count' => $totalCount,
                'new_percentage' => $totalCount > 0 ? round(($newCount / $totalCount) * 100, 1) : 0,
                'repeat_percentage' => $totalCount > 0 ? round(($repeatCount / $totalCount) * 100, 1) : 0,
                'growth' => round($growth, 1)
            ];

            $previousTotal = $totalCount;
        }

        // Filter the monthlyMetrics if a specific year is selected
        if ($tahun !== 'all') {
            $filteredMetrics = [];
            foreach ($monthlyMetrics as $mKey => $metrics) {
                if (str_starts_with($mKey, $tahun . '-')) {
                    $filteredMetrics[] = $metrics;
                }
            }
            $monthlyMetricsResult = $filteredMetrics;
        } else {
            $monthlyMetricsResult = array_values($monthlyMetrics);
        }

        // 8. Top Cities with Paid & Unpaid order ratio
        $totalCustomersCount = Customer::where('status', '!=', 'N')->count();
        $topCities = Customer::where('status', '!=', 'N')
            ->whereNotNull('alamat')
            ->where('alamat', '!=', '')
            ->select('alamat', \DB::raw('count(*) as customer_count'))
            ->groupBy('alamat')
            ->orderBy('customer_count', 'desc')
            ->limit(10)
            ->get();

        $topCitiesData = [];
        foreach ($topCities as $city) {
            $cityName = $city->alamat;
            $count = $city->customer_count;
            $percentage = $totalCustomersCount > 0 ? round(($count / $totalCustomersCount) * 100, 1) : 0;

            $cityOrders = \DB::table('order_customer_arsip')
                ->join('customer', 'order_customer_arsip.customer_id', '=', 'customer.id')
                ->where('customer.status', '!=', 'N')
                ->where('customer.alamat', $cityName)
                ->when($tahun !== 'all', function($q) use ($tahun) {
                    $q->whereYear('order_customer_arsip.tanggal', $tahun);
                })
                ->selectRaw("
                    COUNT(CASE WHEN order_customer_arsip.status_pembayaran = '2' THEN 1 END) as paid_count,
                    COUNT(CASE WHEN order_customer_arsip.status_pembayaran != '2' THEN 1 END) as unpaid_count
                ")
                ->first();

            $topCitiesData[] = [
                'city' => $cityName,
                'customer_count' => $count,
                'percentage' => $percentage,
                'paid_orders' => (int)($cityOrders->paid_count ?? 0),
                'unpaid_orders' => (int)($cityOrders->unpaid_count ?? 0)
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'years' => $availableYears,
                'total_data' => $totalData,
                'total_leads' => $totalLeads,
                'total_customers' => $totalRealCustomers,
                'membership' => $membership,
                'orders' => [
                    'paid_count' => $paidOrdersCount,
                    'paid_amount' => $paidOrdersAmount,
                    'unpaid_count' => $unpaidOrdersCount,
                    'unpaid_amount' => $unpaidOrdersAmount
                ],
                'top_products' => $topProducts,
                'top_customers' => $topCustomersData,
                'customer_growth' => $monthlyMetricsResult,
                'top_cities' => $topCitiesData
            ]
        ]);
    }

    public function form_customer_update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nama_panggilan' => 'required|string|max:255',
            'instagram' => 'required',
            'profesi' => 'required',
            'pendapatan_bln' => 'required',
            'industri_pekerjaan' => 'required',
            'jenis_kelamin' => 'required',
            'tanggal_lahir' => 'required',

            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $customer = Customer::find($id);
        $customer->fill($validator->validated());
        $customer->update_at = now();
        $customer->save();

 
        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'id' => $customer->id
        ], 201);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:customer,email',
            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $wa = $this->formatPhoneNumber($request->wa);
        $wa2 = $request->wa2 ? $this->formatPhoneNumber($request->wa2) : null;

        // Jika sales_id tidak diisi, gunakan round-robin
        $sales_id = !empty($request->sales_id) ? $request->sales_id : $this->getNextSalesId();

        $customer = Customer::create([
            'nama' => $request->nama,
            'nama_panggilan' => $request->nama_panggilan,
            'email' => $request->email,
            'instagram' => $request->instagram,
            'password' => bcrypt("123456"),
            // 'password' => Hash::make($request->password),
            'wa' => $wa,
            'wa2' => $wa2,
            'profesi' => $request->profesi,
            'pendapatan_bln' => $request->pendapatan_bln,
            'industri_pekerjaan' => $request->industri_pekerjaan,
            'jenis_kelamin' => $request->jenis_kelamin,
            'tanggal_lahir' => $request->tanggal_lahir,
            'alamat' => $request->alamat,
            'provinsi' => $request->provinsi,
            'kabupaten' => $request->kabupaten,
            'kecamatan' => $request->kecamatan,
            'kode_pos' => $request->kode_pos,
            // 'status_order' => $request->status_order,
            'verifikasi' => '1',
            'keanggotaan' => 'basic', // Default keanggotaan
            // 'alasan_tertarik' => $request->alasan_tertarik,
            // 'alasan_belum' => $request->alasan_belum,
            // 'harapan' => $request->harapan,
            'create_at' => now(),
            'status' => '1',
            'sales_id' => $sales_id,
            'customer_type' => 'lead', // Semua customer baru masuk sebagai lead dulu
        ]);

        // Generate memberID setelah customer dibuat
        $memberID = $this->generateMemberID($customer);
        $customer->update(['memberID' => $memberID]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil ditambahkan',
            'data' => $customer->fresh()
        ], 201);
    }
 

    public function show($id)
    {
        $customer = Customer::select(array_diff(
                    \Schema::getColumnListing('customer'),
                    ['password','create_at','update_at'] 
                ))
                ->with('sales_rel:id,nama')
                ->where('id', $id)
                ->where('status', '!=', 'N')
                ->first();
        

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        // Tambahkan sales_nama
        $customer->sales_nama = $customer->sales_rel ? $customer->sales_rel->nama : null;

        return response()->json([
            'success' => true,
            'data' => [$customer] // Format array untuk konsistensi dengan index
        ]);
    }

    public function getFollowups($id)
    {
        $followups = CustomerFollowup::with('user:id,nama')
            ->where('customer_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $followups
        ]);
    }

    public function storeFollowup(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'via' => 'required|string',
            'respon' => 'required|string',
            'keterangan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $followup = CustomerFollowup::create([
            'customer_id' => $id,
            'via' => $request->via,
            'respon' => $request->respon,
            'keterangan' => $request->keterangan,
            'created_by' => auth()->user()->user ?? auth()->id(),
        ]);

        $followup->load('user:id,nama');

        return response()->json([
            'success' => true,
            'message' => 'Follow up berhasil disimpan',
            'data' => $followup
        ], 201);
    }


    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        // Validasi keanggotaan jika ada
        $updateData = $request->all();
        if (isset($updateData['keanggotaan'])) {
            $validKeanggotaan = ['basic', 'bronze', 'silver', 'gold', 'platinum', 'diamond'];
            if (!in_array($updateData['keanggotaan'], $validKeanggotaan)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Keanggotaan tidak valid. Pilih: basic, bronze, silver, gold, platinum, atau diamond'
                ], 422);
            }
        }

        // Format phone numbers jika ada
        if (isset($updateData['wa']) && $updateData['wa']) {
            $updateData['wa'] = $this->formatPhoneNumber($updateData['wa']);
        }
        if (isset($updateData['wa2']) && $updateData['wa2']) {
            $updateData['wa2'] = $this->formatPhoneNumber($updateData['wa2']);
        }

        $customer->update($updateData);
        $customer->update_at = now();
        $customer->save();

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'data' => $customer
        ]);
    }



    public function destroy($id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        $customer->update([
            'status'    => "N"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dihapus'
        ]);
    }

    /**
     * Promote lead ke customer secara manual.
     * Digunakan jika konfirmasi pembayaran dilakukan di luar sistem (transfer manual, dll).
     */
    public function promoteToCustomer($id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

        if ($customer->customer_type === 'customer') {
            return response()->json([
                'success' => false,
                'message' => 'Data ini sudah berstatus customer'
            ], 422);
        }

        // Promote ke customer
        $customer->update(['customer_type' => 'customer']);

        // Update semua lead terkait yang masih aktif → CONVERTED
        \App\Models\Lead::where('customer_id', $id)
            ->where('status', '!=', 'N')
            ->whereNotIn('status', ['CONVERTED', 'LOST'])
            ->update(['status' => 'CONVERTED', 'update_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => 'Lead berhasil dipromote ke customer',
            'data'    => $customer->fresh()
        ]);
    }

    /**
     * Menampilkan daftar lead customers dengan data enriched:
     * - score_label (hot/warm/cold)
     * - minat_produk dari lead terbaru
     * - last followup (tanggal, channel, catatan)
     */
    public function indexLeads(Request $request)
    {
        $query = Customer::where('status', '!=', 'N')
            ->where('customer_type', 'lead');

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%")
                  ->orWhere('email', 'ILIKE', "%{$search}%")
                  ->orWhere('wa', 'ILIKE', "%{$search}%")
                  ->orWhere('nama_panggilan', 'ILIKE', "%{$search}%");
            });
        }

        // Filter by sales
        if ($request->has('sales_id') && $request->sales_id) {
            $query->where('sales_id', $request->sales_id);
        }

        // Filter by score_label
        if ($request->has('score_label') && $request->score_label) {
            $query->where('score_label', $request->score_label);
        }

        // Filter by produk_id (supports comma separated multiple ids)
        if ($request->has('produk_id') && $request->produk_id) {
            $produkIds = explode(',', $request->produk_id);
            $query->where(function($q) use ($produkIds) {
                $q->whereHas('orders', function($q2) use ($produkIds) {
                    $q2->whereIn('produk', $produkIds);
                })->orWhereHas('order_arsip', function($q2) use ($produkIds) {
                    $q2->whereIn('produk_id', $produkIds);
                });
            });
        }

        $query->orderBy('create_at', 'desc')->orderBy('id', 'desc');

        $perPage = $request->get('per_page', 15);
        $customers = $query->with('sales_rel:id,nama')->paginate($perPage);

        $customerIds = collect($customers->items())->pluck('id')->toArray();

        // Ambil lead terbaru per customer (minat_produk, last_contact_at)
        $latestLeads = \App\Models\Lead::whereIn('customer_id', $customerIds)
            ->where('status', '!=', 'N')
            ->orderBy('update_at', 'desc')
            ->get()
            ->groupBy('customer_id')
            ->map(function($leads) {
                return $leads->first(); // Lead terbaru per customer
            });

        // Ambil follow up terakhir dari follow_up_lead per lead
        $leadIds = $latestLeads->pluck('id')->filter()->toArray();

        $lastFollowUps = [];
        if (!empty($customerIds)) {
            $lastFollowUps = \DB::table('customer_followups as f')
                ->join(\DB::raw('(SELECT customer_id, MAX(created_at) as max_date FROM customer_followups GROUP BY customer_id) as lf'),
                    function($join) {
                        $join->on('f.customer_id', '=', 'lf.customer_id')
                             ->on('f.created_at', '=', 'lf.max_date');
                    })
                ->whereIn('f.customer_id', $customerIds)
                ->select('f.customer_id', 'f.created_at as follow_up_date', 'f.via as channel', 'f.respon as note', 'f.keterangan')
                ->get()
                ->keyBy('customer_id');
        }

        // Ambil minat_produk dari order aktif (order_customer)
        // Prioritas: order aktif → order arsip → null
        // Ambil nama produk terbaru dari order_customer per customer
        $latestActiveOrders = \DB::table('order_customer as oc')
            ->join('produk as p', 'oc.produk', '=', 'p.id')
            ->whereIn('oc.customer', $customerIds)
            ->where('oc.status', '!=', 'N')
            ->orderByDesc('oc.create_at')
            ->select('oc.customer as customer_id', 'p.nama as produk_nama', 'oc.create_at')
            ->get()
            ->groupBy('customer_id')
            ->map(fn($rows) => $rows->first()->produk_nama);

        // Fallback: order arsip (produk_nama_manual atau join produk)
        $latestArsipOrders = \DB::table('order_customer_arsip as oa')
            ->leftJoin('produk as p', 'oa.produk_id', '=', 'p.id')
            ->whereIn('oa.customer_id', $customerIds)
            ->orderByDesc('oa.tanggal')
            ->select(
                'oa.customer_id',
                \DB::raw("COALESCE(p.nama, oa.produk_nama_manual) as produk_nama"),
                'oa.tanggal'
            )
            ->get()
            ->groupBy('customer_id')
            ->map(fn($rows) => $rows->first()->produk_nama);

        // Enrich data customer
        $enrichedData = collect($customers->items())->map(function($customer) use ($latestLeads, $lastFollowUps, $latestActiveOrders, $latestArsipOrders) {
            $cust = $customer->toArray();
            $cust['sales_nama'] = $customer->sales_rel ? $customer->sales_rel->nama : null;

            // Minat produk: order aktif → arsip → null
            $cust['minat_produk'] = $latestActiveOrders->get($customer->id)
                ?? $latestArsipOrders->get($customer->id)
                ?? null;

            $lead = $latestLeads->get($customer->id);
            if ($lead) {
                $cust['lead_id']           = $lead->id;
                $cust['lead_status']       = $lead->status;
                $cust['last_contact_at']   = $lead->last_contact_at;
                $cust['next_follow_up_at'] = $lead->next_follow_up_at;
            } else {
                $cust['lead_id']           = null;
                $cust['lead_status']       = null;
                $cust['last_contact_at']   = null;
                $cust['next_follow_up_at'] = null;
            }

            $followUp = $lastFollowUps->get($customer->id);
            if ($followUp) {
                $cust['last_followup'] = [
                    'date'    => $followUp->follow_up_date,
                    'channel' => $followUp->channel,
                    'note'    => $followUp->note,
                    'keterangan' => $followUp->keterangan,
                ];
            } else {
                $cust['last_followup'] = null;
            }

            return $cust;
        })->values()->toArray();

        // Stats
        $totalQuery = Customer::where('status', '!=', 'N')->where('customer_type', 'lead');
        $hotCount  = (clone $totalQuery)->where('score_label', 'hot')->count();
        $warmCount = (clone $totalQuery)->where('score_label', 'warm')->count();
        $coldCount = (clone $totalQuery)->where('score_label', 'cold')->count();

        return response()->json([
            'success' => true,
            'data' => $enrichedData,
            'pagination' => [
                'current_page' => $customers->currentPage(),
                'last_page'    => $customers->lastPage(),
                'per_page'     => $customers->perPage(),
                'total'        => $customers->total(),
            ],
            'stats' => [
                'total' => $customers->total(),
                'hot'   => $hotCount,
                'warm'  => $warmCount,
                'cold'  => $coldCount,
            ],
        ]);
    }

    public function importFromExcel(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!class_exists(IOFactory::class)) {
            return response()->json([
                'success' => false,
                'message' => 'Library PhpSpreadsheet belum terpasang. Jalankan: composer require phpoffice/phpspreadsheet',
            ], 500);
        }

        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet       = $spreadsheet->getActiveSheet();
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 500);
        }

        $highestRow = $sheet->getHighestRow();

        // Reset static variable untuk tracking memberID yang sudah digunakan
        self::$usedMemberIDs = [];

        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors  = [];

        for ($row = 2; $row <= $highestRow; $row++) {
            try {
                $email = trim((string) $sheet->getCell('B' . $row)->getValue());

                $createAtCell   = $sheet->getCell('A' . $row);
                $nama           = trim((string) $sheet->getCell('C' . $row)->getValue());
                $sapaan         = trim((string) $sheet->getCell('D' . $row)->getValue());
                $namaPanggilan  = trim((string) $sheet->getCell('E' . $row)->getValue());
                $instagram      = trim((string) $sheet->getCell('F' . $row)->getValue());
                $genderRaw      = strtolower(trim((string) $sheet->getCell('G' . $row)->getValue()));
                $tglLahirCell   = $sheet->getCell('H' . $row);
                $profesi        = trim((string) $sheet->getCell('I' . $row)->getValue());
                $pendapatanRaw  = trim((string) $sheet->getCell('J' . $row)->getValue());
                $industri       = trim((string) $sheet->getCell('K' . $row)->getValue());
                $alamat         = trim((string) $sheet->getCell('L' . $row)->getValue());
                $riwayatOrder   = trim((string) $sheet->getCell('M' . $row)->getValue());
                $alasanTertarik = trim((string) $sheet->getCell('N' . $row)->getValue());
                $alasanBelum    = trim((string) $sheet->getCell('O' . $row)->getValue());
                $harapan        = trim((string) $sheet->getCell('P' . $row)->getValue());
                $waRaw          = trim((string) $sheet->getCell('Q' . $row)->getValue());

                // Jika email kosong, generate email dummy supaya tetap bisa disimpan
                $isDummyEmail = false;
                if (!$email) {
                    $email        = $this->generateDummyEmail($waRaw, $row);
                    $isDummyEmail = true;
                }

                // create_at dari kolom A (tanggal + jam)
                $createAt = $this->parseExcelDateTime($createAtCell) ?? now()->format('Y-m-d H:i:s');

                // jenis kelamin
                $jenisKelamin = null;
                if (str_contains($genderRaw, 'laki')) {
                    $jenisKelamin = 'L';
                } elseif (str_contains($genderRaw, 'perem')) {
                    $jenisKelamin = 'P';
                }

                // tanggal lahir dari kolom H (hanya tanggal)
                $tanggalLahir = $this->parseExcelDate($tglLahirCell);

                // pendapatan bulanan (klasifikasi)
                $pendapatanBln = $this->normalizeIncome($pendapatanRaw);

                // WA
                $wa = $waRaw ? $this->formatPhoneNumber($waRaw) : null;

                // Generate memberID berdasarkan kolom A (create_at) sebelum customer dibuat
                $memberID = $this->generateMemberIDFromDate($createAt);

                // Pastikan sapaan tersimpan jika ada nilainya
                $sapaanValue = !empty(trim($sapaan)) ? trim($sapaan) : null;
                
                $data = [
                    'nama'               => $nama ?: $namaPanggilan ?: $email,
                    'sapaan'             => $sapaanValue,
                    'nama_panggilan'     => $namaPanggilan ?: null,
                    'instagram'          => $instagram ?: null,
                    'wa'                 => $wa,
                    'wa2'                => null, // wa2 tidak ada di Excel import
                    'profesi'            => $profesi ?: null,
                    'pendapatan_bln'     => $pendapatanBln,
                    'industri_pekerjaan' => $industri ?: null,
                    'jenis_kelamin'      => $jenisKelamin,
                    'tanggal_lahir'      => $tanggalLahir,
                    'alamat'             => $alamat ?: null,
                    'provinsi'           => null, // Akan diisi otomatis
                    'kabupaten'          => null, // Akan diisi otomatis
                    'kecamatan'          => null, // Akan diisi otomatis
                    'status_order'       => $riwayatOrder ?: null,
                    'alasan_tertarik'    => $alasanTertarik ?: null,
                    'alasan_belum'       => $alasanBelum ?: null,
                    'harapan'            => $harapan ?: null,
                    'verifikasi'         => '1',
                    'status'             => '1',
                ];

                $customer = null;

                // Hanya update jika email asli (bukan dummy) dan sudah ada di database
                if (!$isDummyEmail) {
                    $customer = Customer::where('email', $email)->first();
                }

                if ($customer) {
                    $customer->fill($data);
                    $customer->update_at = now();
                    $customer->save();
                    $updated++;
                } else {
                    $data['email']      = $email;
                    $data['password']   = bcrypt('123456');
                    $data['create_at']  = $createAt;
                    $data['keanggotaan'] = 'basic'; // Default keanggotaan
                    $data['memberID']   = $memberID; // Set memberID langsung
                    // Jika sales_id tidak diisi, gunakan round-robin
                    if (empty($data['sales_id'])) {
                        $data['sales_id'] = $this->getNextSalesId();
                    }

                    $newCustomer = Customer::create($data);
                    $created++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = [
                    'row'    => $row,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Import customer dari Excel selesai',
            'data'    => [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'errors'  => $errors,
            ],
        ]);
    }

    public function importArsipFromExcel(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet       = $spreadsheet->getActiveSheet();
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 500);
        }

        $highestRow = $sheet->getHighestRow();
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors  = [];

        for ($row = 0; $row <= $highestRow; $row++) {
            try {
                // B: PHONE (WA)
                $waRaw = trim((string) $sheet->getCell('B' . $row)->getValue());
                if (empty($waRaw)) {
                    $skipped++;
                    continue;
                }
                $wa = $this->formatPhoneNumber($waRaw);

                // C: NAMA LENGKAP
                
                $sapaan = trim((string) $sheet->getCell('C' . $row)->getValue());
                
                $namaPanggilan = trim((string) $sheet->getCell('D' . $row)->getValue());
                
                $nama = trim((string) $sheet->getCell('E' . $row)->getValue());

                // D: PRODUK
                $produkName = trim((string) $sheet->getCell('F' . $row)->getValue());

                // E: DOMISILI
                $domisili = trim((string) $sheet->getCell('G' . $row)->getValue());

                // F: EMAIL
                $email = trim((string) $sheet->getCell('H' . $row)->getValue());

                // G: HARGA
                $harga = trim((string) $sheet->getCell('J' . $row)->getValue());

                // I: STATUS (unpaid/paid)
                $statusPaidRaw = strtolower(trim((string) $sheet->getCell('K' . $row)->getValue()));
                $statusPaid = preg_replace('/[^a-z]/', '', $statusPaidRaw);

                // H: KOLOM H (Harga / Nilai untuk keanggotaan)
                $kolomH = trim((string) $sheet->getCell('J' . $row)->getValue());
                $cleanH = str_replace(['Rp', 'rp', '.', ' '], '', $kolomH);
                $cleanH = explode(',', $cleanH)[0];
                $nilaiH = (float) $cleanH;

                $keanggotaan = 'basic';
                if (stripos($produkName, 'workshop') !== false) {
                    if ($nilaiH >= 3000000 && $nilaiH < 5000000) {
                        $keanggotaan = 'silver';
                    } elseif ($nilaiH >= 5000000 && $nilaiH < 7000000) {
                        $keanggotaan = 'gold';
                    } elseif ($nilaiH >= 7000000) {
                        $keanggotaan = 'platinum';
                    }
                }

                // J: ORDER DATE
                $orderDateCell = $sheet->getCell('L' . $row);

                
                $sumber = trim((string) $sheet->getCell('N' . $row)->getValue());


                // M: STATUS ORDER
                $statusOrderRawCell = strtolower(trim((string) $sheet->getCell('O' . $row)->getValue()));
                // Bersihkan dari karakter tersembunyi (seperti non-breaking space)
                $statusOrderRaw = preg_replace('/[^a-z0-9]/', '', $statusOrderRawCell);
                
                $statusOrder = '1'; // Default Pending
                
                if (in_array($statusOrderRaw, ['pending', '1'])) {
                    $statusOrder = '1';
                } elseif (in_array($statusOrderRaw, ['prosessing', 'processing', '2'])) {
                    $statusOrder = '2';
                } elseif (in_array($statusOrderRaw, ['canceled', 'cancelled', 'cancell', 'cancel', '3'])) {
                    $statusOrder = '3';
                } elseif (in_array($statusOrderRaw, ['completed', 'complete', '4'])) {
                    $statusOrder = '4';
                } elseif (in_array($statusOrderRaw, ['deleted', 'n'])) {
                    $statusOrder = 'N';
                } else {
                    // Jika teks tidak dikenali (misal kosong atau "archive"), jangan disimpan mentah-mentah.
                    // Default ke '1' (Pending).
                    $statusOrder = '1';
                }

                $tanggalOrder = $this->parseExcelDateTime($orderDateCell) ?? now()->format('Y-m-d H:i:s');

                // Generate memberID dari tanggalOrder (Format: YYYYMMDD + 5 random digits)
                $memberID = $this->generateMemberIDFromDate($tanggalOrder);

                // 1. Handle Customer
                $customer = Customer::where('wa', $wa)->first();
                if (!$customer) {
                    $customer = Customer::create([
                        'nama' => $nama ?: 'Kak',
                        'wa' => $wa,
                        'email' => $email ?: null,
                        'alamat' => $domisili ?: null,
                        'create_at' => $tanggalOrder,
                        'status' => '1',
                        'keanggotaan' => $keanggotaan,
                        'password' => '', // Default password dikosongkan sesuai instruksi
                        'memberID' => $memberID,
                    ]);
                    $created++;
                } else {
                    $updateData = [];
                    
                    // Cek apakah tanggal order dari excel lebih lama (older) dari create_at customer
                    $isOlder = false;
                    if (!empty($customer->create_at)) {
                        try {
                            $isOlder = \Carbon\Carbon::parse($tanggalOrder)->lt(\Carbon\Carbon::parse($customer->create_at));
                        } catch (\Throwable $e) {}
                    }

                    //  return response()->json([
                    //         'isOlder' => $isOlder,
                    //     ]);

                    // break;

                    // Jika lebih lama (atau belum ada create_at), update create_at dan memberID
                    if (empty($customer->create_at) || $isOlder) {
                        $updateData['create_at'] = $tanggalOrder;
                        $updateData['memberID']  = $memberID;

                        // return response()->json([
                        //     'tanggalOrder' => $tanggalOrder,
                        //     'memberID' => $memberID,
                        // ]);

                        // break;
                    } 
                    // Jika tidak lebih lama tapi memberID masih kosong, tetap update memberID
                    elseif (empty($customer->memberID)) {
                        $updateData['memberID'] = $memberID;
                    }
                    
                    // Update keanggotaan jika dari excel dapat level yang lebih tinggi atau ada data keanggotaan baru selain basic
                    if ($keanggotaan !== 'basic' && $customer->keanggotaan !== $keanggotaan) {
                        $updateData['keanggotaan'] = $keanggotaan;
                    }

                    if (!empty($updateData)) {
                        $customer->update($updateData);
                    }
                    $updated++;
                }

                // 2. Handle Produk
                $produk = null;
                if (!empty($produkName)) {
                    $produk = Produk::where('nama', 'ILIKE', $produkName." - arsip (2025)")->first();
                    if (!$produk) {
                        $produk = Produk::create([
                            'nama' => $produkName." - arsip (2025)",
                            'kode' => $this->generateProductCode($produkName),
                            'status' => 'N', // Sesuai instruksi: status langsung N
                            'harga' => (float) str_replace(',', '', $harga) ?: 0,
                        ]);
                    }
                }

                // 3. Handle Order Arsip
                // Cek jika customer yang sama order dengan produk yang sama (jangan double data)
                $existingOrder = OrderCustomerArsip::where('customer_id', $customer->id)
                    ->where('produk_nama_manual', $produkName)
                    ->first();

                $newStatusPembayaran = $statusPaid == 'paid' ? '2' : '0';

                if (!$existingOrder) {
                    OrderCustomerArsip::create([
                        'customer_id' => $customer->id,
                        'produk_id' => $produk ? $produk->id : null,
                        'produk_nama_manual' => $produkName,
                        'harga' => $nilaiH,
                        'status_pembayaran' => $newStatusPembayaran,
                        'status_order' => $statusOrder,
                        'tanggal' => $tanggalOrder,
                        'sumber' => $sumber,
                    ]);
                } else {
                    $validStatuses = ['1', '2', '3', '4', 'N'];
                    $isInvalidStatus = !in_array($existingOrder->status_order, $validStatuses);

                    // Bandingkan berdasarkan status_order (1: pending, 2: processing, 3: canceled, 4: completed).
                    // Update jika status_order di excel lebih tinggi dari database, ATAU jika data di database tidak valid.
                    if ($isInvalidStatus || $statusOrder > $existingOrder->status_order) {
                        $existingOrder->update([
                            'status_pembayaran' => $newStatusPembayaran,
                            'status_order' => $statusOrder,
                            'harga' => $nilaiH,
                            'tanggal' => $tanggalOrder,
                            'sumber' => $sumber,
                        ]);
                    }
                }

            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = [
                    'row'    => $row,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Import data arsip selesai',
            'data'    => [
                'created_customer' => $created,
                'updated_customer' => $updated,
                'skipped' => $skipped,
                'errors'  => $errors,
            ],
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

    private function normalizeIncome(?string $raw): ?string
    {
        if (!$raw) {
            return null;
        }

        $value = strtoupper(str_replace([' ', 'JT', 'JUTA', 'Jt'], '', $raw));

        // Bentuk standar contoh file: <3, 3-5, 4-8, >15, dll.
        if (str_starts_with($value, '<')) {
            return '<5';
        }

        if (str_starts_with($value, '>')) {
            $num = (float) ltrim($value, '><= ');
            if ($num <= 15) {
                return '16-20';
            }
            if ($num <= 50) {
                return '20-50';
            }
            if ($num <= 100) {
                return '50-100';
            }
            return '>100';
        }

        // Rentang, contoh 3-5, 4-8, 10-15, dll.
        if (str_contains($value, '-')) {
            [$min, $max] = array_pad(explode('-', $value, 2), 2, null);
            $min = (float) $min;
            $max = (float) $max;

            $avg = ($min + $max) / 2;

            if ($avg < 5) {
                return '<5';
            }
            if ($avg >= 5 && $avg < 10) {
                return '5-9';
            }
            if ($avg >= 10 && $avg <= 15) {
                return '10-15';
            }
            if ($avg > 15 && $avg <= 20) {
                return '16-20';
            }
            if ($avg > 20 && $avg <= 50) {
                return '20-50';
            }
            if ($avg > 50 && $avg <= 100) {
                return '50-100';
            }

            return '>100';
        }

        // Fallback: angka tunggal
        $num = (float) $value;
        if ($num < 5) {
            return '<5';
        }
        if ($num >= 5 && $num < 10) {
            return '5-9';
        }
        if ($num >= 10 && $num <= 15) {
            return '10-15';
        }
        if ($num > 15 && $num <= 20) {
            return '16-20';
        }
        if ($num > 20 && $num <= 50) {
            return '20-50';
        }
        if ($num > 50 && $num <= 100) {
            return '50-100';
        }

        return '>100';
    }

    /**
     * Parse Excel cell (date or datetime) menjadi format Y-m-d H:i:s
     *
     * @param Cell|null $cell
     * @return string|null
     */
    private function parseExcelDateTime(?Cell $cell): ?string
    {
        if (!$cell) {
            return null;
        }

        $value = $cell->getValue();

        // Jika numeric, anggap serial date Excel
        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->format('Y-m-d H:i:s');
            } catch (\Throwable $e) {
                // fallback ke bawah
            }
        }

        $formatted = trim((string) $cell->getFormattedValue());
        if ($formatted === '') {
            return null;
        }

        // Daftar format yang umum ditemui di Excel
        $formats = [
            'd/m/Y H:i:s',
            'm/d/Y H:i:s',
            'd/m/Y H:i',
            'm/d/Y H:i',
            'd/m/Y h:i:s A',
            'm/d/Y h:i:s A',
            'd/m/Y h:i A',
            'm/d/Y h:i A',
            'd/m/Y',
            'm/d/Y',
            'd-m-Y H:i:s',
            'd-m-Y H:i',
            'd-m-Y - H:i',
            'd-m-Y',
            'Y-m-d H:i:s',
            'Y-m-d H:i',
            'Y-m-d',
        ];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $formatted)->format('Y-m-d H:i:s');
            } catch (\Throwable $e) {
                continue;
            }
        }

        // Fallback generic
        try {
            return Carbon::parse($formatted)->format('Y-m-d H:i:s');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Parse Excel cell date menjadi format Y-m-d (untuk tanggal_lahir)
     *
     * @param Cell|null $cell
     * @return string|null
     */
    private function parseExcelDate(?Cell $cell): ?string
    {
        if (!$cell) {
            return null;
        }

        $value = $cell->getValue();

        if (is_numeric($value)) {
            try {
                $dt = ExcelDate::excelToDateTimeObject($value);
                return Carbon::instance($dt)->format('Y-m-d');
            } catch (\Throwable $e) {
                // fallback
            }
        }

        $formatted = trim((string) $cell->getFormattedValue());
        if ($formatted === '') {
            return null;
        }

        $formats = [
            'd/m/Y H:i:s',
            'm/d/Y H:i:s',
            'd/m/Y H:i',
            'm/d/Y H:i',
            'd/m/Y h:i:s A',
            'm/d/Y h:i:s A',
            'd/m/Y h:i A',
            'm/d/Y h:i A',
            'd/m/Y',
            'm/d/Y',
            'd-m-Y H:i:s',
            'd-m-Y H:i',
            'd-m-Y - H:i',
            'd-m-Y',
            'Y-m-d H:i:s',
            'Y-m-d H:i',
            'Y-m-d',
        ];

        foreach ($formats as $format) {
            try {
                return Carbon::createFromFormat($format, $formatted)->format('Y-m-d');
            } catch (\Throwable $e) {
                continue;
            }
        }

        try {
            return Carbon::parse($formatted)->format('Y-m-d');
        } catch (\Throwable $e) {
            return null;
        }
    }

    /**
     * Generate email dummy yang valid & unik untuk data tanpa email
     */
    private function generateDummyEmail(?string $waRaw, int $row): string
    {
        // Gunakan WA sebagai bagian dari username jika ada
        $wa = preg_replace('/[^0-9]/', '', (string) $waRaw);
        if ($wa) {
            $username = 'noemail_' . substr($wa, -8);
        } else {
            $username = 'noemail_row' . $row . '_' . uniqid();
        }

        return $username . '@dummy.onedashboard.local';
    }

    public function riwayat_order(Request $request, $id)
    {
        $riwayat_order = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa'
        ])
        ->where('customer', $id)
        ->orderBy('create_at', 'desc')
        ->get();

        // Ambil data dari tabel arsip (tahun 2023)
        $riwayat_arsip = OrderCustomerArsip::with(['produk:id,nama'])
            ->where('customer_id', $id)
            ->orderBy('tanggal', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat order berhasil diambil',
            'data' => $riwayat_order,
            'arsip' => $riwayat_arsip
        ]);
    }

    public function followup($id)
    {
        // Cek apakah customer ada
        $customer = Customer::find($id);
        
        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

        // Ambil semua follow up untuk customer ini
        $followups = LogsFollup::with([
            'follup_rel:id,nama,text,event,produk_id,type',
            'follup_rel.produk_rel:id,nama' // relasi produk jika ada
        ])
        ->where('customer', $id)
        ->where('status', '!=', 'N')
        ->orderBy('create_at', 'desc')
        ->get();

        return response()->json([
            'success' => true,
            'message' => 'Data follow up berhasil diambil',
            'customer' => [
                'id' => $customer->id,
                'nama' => $customer->nama,
                'email' => $customer->email,
                'wa' => $customer->wa
            ],
            'total' => $followups->count(),
            'data' => $followups
        ]);
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
        
        return $this->generateMemberIDFromDate($createAt, $customer->id ?? null);
    }

    /**
     * Generate MemberID dari tanggal (untuk import Excel)
     * Format: 2025010100001 (tahun, bulan, tanggal, random sequence)
     */
    private function generateMemberIDFromDate($createAt, $customerId = null)
    {
        // Jika create_at adalah string, convert ke Carbon
        if (is_string($createAt)) {
            $createAt = Carbon::parse($createAt);
        }
        
        // Format: YYYYMMDD
        $datePart = $createAt->format('Ymd');
        
        // Generate random sequence (5 digit: 00001-99999)
        $maxAttempts = 1000; // Meningkatkan max attempts untuk menghindari konflik
        $attempts = 0;
        
        do {
            // Generate random number antara 1-99999 menggunakan random_int untuk lebih aman dan random
            $randomSequence = random_int(1, 99999);
            
            // Tambahkan variasi dengan microtime untuk mengurangi kemungkinan duplikasi
            if ($attempts > 0) {
                $microtimePart = (int) ((microtime(true) * 10000) % 99999);
                $randomSequence = (($randomSequence + $microtimePart + $attempts) % 99999) + 1;
            }
            
            $sequence = str_pad($randomSequence, 5, '0', STR_PAD_LEFT);
            
            // Gabungkan: YYYYMMDD + random sequence
            $memberID = $datePart . $sequence;
            
            // Cek apakah memberID sudah ada di database
            $existsInDB = Customer::where('memberID', $memberID)
                ->when($customerId, function($q) use ($customerId) {
                    $q->where('id', '!=', $customerId);
                })
                ->exists();
            
            // Cek juga apakah memberID sudah digunakan dalam batch import ini (static variable)
            $existsInBatch = in_array($memberID, self::$usedMemberIDs);
            
            $exists = $existsInDB || $existsInBatch;
            
            $attempts++;
            
            // Jika sudah mencoba terlalu banyak, gunakan kombinasi timestamp + random sebagai fallback
            if ($attempts >= $maxAttempts) {
                $timestampPart = substr(time(), -4); // 4 digit terakhir timestamp
                $randomPart = random_int(0, 9); // 1 digit random
                $sequence = str_pad($timestampPart . $randomPart, 5, '0', STR_PAD_LEFT);
                $memberID = $datePart . $sequence;
                
                // Cek sekali lagi apakah masih ada duplikasi
                $finalCheck = Customer::where('memberID', $memberID)
                    ->when($customerId, function($q) use ($customerId) {
                        $q->where('id', '!=', $customerId);
                    })
                    ->exists();
                
                if (!$finalCheck && !in_array($memberID, self::$usedMemberIDs)) {
                    break;
                }
                
                // Jika masih ada duplikasi, gunakan uniqid
                $uniquePart = substr(str_replace('.', '', uniqid('', true)), -5);
                $sequence = str_pad($uniquePart, 5, '0', STR_PAD_LEFT);
                $memberID = $datePart . $sequence;
                break;
            }
        } while ($exists);
        
        // Simpan memberID yang digunakan untuk batch import ini
        self::$usedMemberIDs[] = $memberID;
        
        return $memberID;
    }

    /**
     * Penetapan sales otomatis (assign produk: 0/2+ RR, 1 sales tetap). Tanpa produk = RR semua sales.
     */
    private function getNextSalesId(?int $produkId = null): ?int
    {
        return app(SalesRoundRobinService::class)->getNextSalesId($produkId);
    }

    /**
     * Import customer dari Excel khusus untuk produk workshop
     * Format Excel:
     * - Kolom A: phone
     * - Kolom B: name
     * - Kolom C: sapaan
     * - Kolom D: panggilan
     * - Kolom F: product
     * - Kolom G: harga
     */
    public function importWorkshopCustomer(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!class_exists(IOFactory::class)) {
            return response()->json([
                'success' => false,
                'message' => 'Library PhpSpreadsheet belum terpasang. Jalankan: composer require phpoffice/phpspreadsheet',
            ], 500);
        }

        $file = $request->file('file');

        try {
            $spreadsheet = IOFactory::load($file->getRealPath());
            $sheet = $spreadsheet->getActiveSheet();
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal membaca file Excel: ' . $e->getMessage(),
            ], 500);
        }

        $highestRow = $sheet->getHighestRow();
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];
        $productsCreated = 0;

        // Reset static variable untuk tracking memberID
        self::$usedMemberIDs = [];

        // Get current user untuk user_input produk
        $currentUser = auth()->user();
        $userId = $currentUser ? $currentUser->id : 1; // Default ke 1 jika tidak ada user

        for ($row = 3; $row <= $highestRow; $row++) { // Mulai dari row 3 karena row 2 adalah header
            try {
                // Baca data dari Excel sesuai format
                // Gunakan getCalculatedValue() untuk handle formula Excel
                $phoneCell = $sheet->getCell('A' . $row);
                $nameCell = $sheet->getCell('B' . $row);
                $sapaanCell = $sheet->getCell('C' . $row);
                $panggilanCell = $sheet->getCell('D' . $row);
                $productNameCell = $sheet->getCell('F' . $row);
                $hargaRawCell = $sheet->getCell('G' . $row);
                
                $phone = trim((string) $phoneCell->getCalculatedValue());
                $name = trim((string) $nameCell->getCalculatedValue());
                $sapaan = trim((string) $sapaanCell->getCalculatedValue());
                $panggilanRaw = trim((string) $panggilanCell->getCalculatedValue());
                $productName = trim((string) $productNameCell->getCalculatedValue());
                $hargaRaw = trim((string) $hargaRawCell->getCalculatedValue());
                
                // Clean nama_panggilan: hapus formula Excel dan limit panjang (max 40 karakter)
                $panggilan = $this->cleanNamaPanggilan($panggilanRaw);

                // Skip jika tidak ada data penting
                if (empty($phone) && empty($name)) {
                    $skipped++;
                    continue;
                }

                // Filter: hanya produk yang mengandung keyword "workshop"
                if (empty($productName) || stripos($productName, 'workshop') === false) {
                    $skipped++;
                    continue;
                }

                // Parse harga dari format "Rp100,000" atau angka
                $harga = $this->parseHarga($hargaRaw);

                // Tentukan keanggotaan berdasarkan harga
                $keanggotaan = $this->determineKeanggotaan($harga);

                // Cari atau buat produk
                $produk = Produk::where('nama', $productName)
                    ->where('kategori', 6)
                    ->first();

                if (!$produk) {
                    // Generate kode produk dari nama
                    $kode = $this->generateProductCode($productName);

                    // Buat produk baru dengan kategori 6
                    $produk = Produk::create([
                        'kategori' => 6,
                        'user_input' => $userId,
                        'kode' => $kode,
                        'nama' => $productName,
                        'harga_asli' => $harga,
                        'status' => '1',
                        'create_at' => now(),
                    ]);
                    $productsCreated++;
                }

                // Format phone number
                $wa = $phone ? $this->formatPhoneNumber($phone) : null;

                // Email dikosongkan (null)
                $email = null;

                // Generate memberID
                $memberID = $this->generateMemberIDFromDate(now());

                // Cari customer berdasarkan WA
                $customer = null;
                if ($wa) {
                    $customer = Customer::where('wa', $wa)->first();
                }

                if ($customer) {
                    // Update customer yang sudah ada
                    // Handle riwayat_order sebagai array
                    $riwayatOrder = [];
                    if ($customer->riwayat_order) {
                        $riwayatOrder = is_string($customer->riwayat_order) 
                            ? json_decode($customer->riwayat_order, true) ?? []
                            : (array) $customer->riwayat_order;
                    }
                    
                    // Tambahkan produk ID jika belum ada
                    if (!in_array($produk->id, $riwayatOrder)) {
                        $riwayatOrder[] = $produk->id;
                    }
                    
                    // Akumulasi total_spend (varchar)
                    $totalSpendLama = (float) ($customer->total_spend ?? 0);
                    $totalSpend = (string) ($totalSpendLama + $harga);
                    
                    $updateData = [
                        'nama' => $name ?: $customer->nama,
                        'nama_panggilan' => $panggilan ?: $customer->nama_panggilan,
                        'sapaan' => $sapaan ?: $customer->sapaan,
                        'wa' => $wa ?: $customer->wa,
                        'wa2' => $customer->wa2, // Keep existing wa2
                        'keanggotaan' => $keanggotaan,
                        'status_order' => json_encode($riwayatOrder),
                        'total_spend' => $totalSpend,
                        'update_at' => now(),
                    ];
                    
                    // Set sales_id jika belum ada
                    if (empty($customer->sales_id)) {
                        $updateData['sales_id'] = $this->getNextSalesId($produk->id);
                    }
                    
                    $customer->update($updateData);
                    $updated++;
                } else {
                    // Buat customer baru
                    $customer = Customer::create([
                        'nama' => $name ?: 'Customer',
                        'nama_panggilan' => $panggilan,
                        'sapaan' => $sapaan,
                        'email' => $email,
                        'wa' => $wa,
                        'wa2' => null, // wa2 tidak ada di workshop import
                        'password' => bcrypt('123456'),
                        'keanggotaan' => $keanggotaan,
                        'status_order' => json_encode([$produk->id]),
                        'total_spend' => (string) $harga,
                        'verifikasi' => '1',
                        'status' => '1',
                        'memberID' => $memberID,
                        'create_at' => now(),
                        'sales_id' => $this->getNextSalesId($produk->id),
                    ]);
                    $created++;
                }
            } catch (\Throwable $e) {
                $skipped++;
                $errors[] = [
                    'row' => $row,
                    'reason' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Import customer workshop selesai',
            'data' => [
                'created' => $created,
                'updated' => $updated,
                'skipped' => $skipped,
                'products_created' => $productsCreated,
                'errors' => $errors,
            ],
        ]);
    }

    /**
     * Parse harga dari format Excel (Rp100,000 atau angka)
     */
    private function parseHarga($hargaRaw)
    {
        if (empty($hargaRaw)) {
            return 0;
        }

        // Hapus "Rp", spasi, dan koma
        $harga = preg_replace('/[Rp\s,]/', '', $hargaRaw);
        
        // Convert ke float
        $harga = (float) $harga;

        // Jika harga hanya 3 digit (misal 800), tambahkan 000 di belakang (800000)
        if ($harga > 0 && $harga < 1000 && $harga == floor($harga)) {
            $harga = $harga * 1000;
        }

        return $harga;
    }

    /**
     * Tentukan keanggotaan berdasarkan harga
     */
    private function determineKeanggotaan($harga)
    {
        // Convert ke juta
        $hargaJuta = $harga / 1000000;

        if ($hargaJuta >= 0 && $hargaJuta <= 2) {
            return 'bronze';
        } elseif ($hargaJuta >= 3 && $hargaJuta <= 4) {
            return 'silver';
        } elseif ($hargaJuta >= 5 && $hargaJuta <= 6) {
            return 'gold';
        } elseif ($hargaJuta >= 7) {
            return 'platinum';
        }

        return 'bronze'; // Default
    }

    /**
     * Clean nama_panggilan: hapus formula Excel dan limit panjang
     */
    private function cleanNamaPanggilan($panggilanRaw)
    {
        if (empty($panggilanRaw)) {
            return null;
        }

        // Hapus formula Excel jika ada (misal: =IFERROR(...))
        $panggilan = preg_replace('/^=.*?\(/', '', $panggilanRaw);
        
        // Hapus karakter khusus Excel
        $panggilan = preg_replace('/[=IFERROR|LEFT|FIND|B\d+|,|\)|\(]/', '', $panggilan);
        
        // Trim dan hapus spasi berlebih
        $panggilan = trim($panggilan);
        $panggilan = preg_replace('/\s+/', ' ', $panggilan);
        
        // Limit panjang maksimal 40 karakter (sesuai database)
        if (mb_strlen($panggilan) > 40) {
            $panggilan = mb_substr($panggilan, 0, 40);
        }
        
        return $panggilan ?: null;
    }

    /**
     * Generate kode produk dari nama
     */
    private function generateProductCode($productName)
    {
        // Generate slug dari nama produk
        $kode = strtolower($productName);
        $kode = preg_replace('/[^a-z0-9]+/', '-', $kode);
        $kode = trim($kode, '-');
        $kode = substr($kode, 0, 50); // Max 50 karakter

        // Cek apakah kode sudah ada
        $baseKode = $kode;
        $counter = 1;
        while (Produk::where('kode', $kode)->exists()) {
            $kode = $baseKode . '-' . $counter;
            $counter++;
        }

        return $kode;
    }
}

