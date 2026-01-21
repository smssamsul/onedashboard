<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Sales;
use App\Models\Customer;
use App\Models\OrderCustomer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalesController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get all sales with pagination
     */
    public function index(Request $request)
    {
        $query = Sales::with(['user_rel', 'karyawan_rel']);

        // Search berdasarkan nama user atau woowa_key
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->whereHas('user_rel', function($q) use ($search) {
                $q->where('nama', 'ILIKE', "%{$search}%");
            })->orWhere('woowa_key', 'ILIKE', "%{$search}%");
        }

        // Filter berdasarkan user_id
        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        // Jika parameter all=true, return semua data tanpa pagination
        if ($request->has('all') && $request->all == 'true') {
            $sales = $query->orderBy('id', 'desc')->get();
            
            return response()->json([
                'success' => true,
                'data' => $sales,
                'total' => $sales->count()
            ]);
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $sales = $query->orderBy('id', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $sales->items(),
            'pagination' => [
                'current_page' => $sales->currentPage(),
                'last_page' => $sales->lastPage(),
                'per_page' => $sales->perPage(),
                'total' => $sales->total(),
            ]
        ]);
    }

    /**
     * Get single sales by ID
     */
    public function show($id)
    {
        $sales = Sales::with(['user_rel', 'karyawan_rel'])->find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $sales
        ]);
    }

    /**
     * Create new sales
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer|exists:user,id',
            'woowa_key' => 'nullable|string|max:150',
            'urutan' => 'nullable|string|max:150',
            'last_update_lead' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Cek apakah user_id sudah ada di sales
        $existingSales = Sales::where('user_id', $request->user_id)->first();
        if ($existingSales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales dengan user_id tersebut sudah ada'
            ], 422);
        }

        // Jika urutan tidak diisi, generate otomatis
        $urutan = $request->urutan;
        if (!$urutan) {
            $urutan = (string)(Sales::count() + 1);
        }

        $sales = Sales::create([
            'user_id' => $request->user_id,
            'woowa_key' => $request->woowa_key,
            'urutan' => $urutan,
            'last_update_lead' => $request->last_update_lead,
            'create_at' => now()->format('Y-m-d H:i:s'),
            'update_at' => null,
        ]);

        $sales->load(['user_rel', 'karyawan_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil ditambahkan',
            'data' => $sales
        ], 201);
    }

    /**
     * Update sales
     */
    public function update(Request $request, $id)
    {
        $sales = Sales::find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'user_id' => 'nullable|integer|exists:user,id',
            'woowa_key' => 'nullable|string|max:150',
            'urutan' => 'nullable|string|max:150',
            'last_update_lead' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Jika user_id diubah, cek apakah user_id baru sudah ada
        if ($request->has('user_id') && $request->user_id != $sales->user_id) {
            $existingSales = Sales::where('user_id', $request->user_id)
                ->where('id', '!=', $id)
                ->first();
            if ($existingSales) {
                return response()->json([
                    'success' => false,
                    'message' => 'Sales dengan user_id tersebut sudah ada'
                ], 422);
            }
        }

        $sales->user_id = $request->user_id ?? $sales->user_id;
        $sales->woowa_key = $request->woowa_key ?? $sales->woowa_key;
        $sales->urutan = $request->urutan ?? $sales->urutan;
        $sales->last_update_lead = $request->last_update_lead ?? $sales->last_update_lead;
        $sales->update_at = now()->format('Y-m-d H:i:s');
        $sales->save();

        $sales->load(['user_rel', 'karyawan_rel']);

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil diupdate',
            'data' => $sales
        ]);
    }

    /**
     * Delete sales
     */
    public function destroy($id)
    {
        $sales = Sales::find($id);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        $sales->delete();

        return response()->json([
            'success' => true,
            'message' => 'Sales berhasil dihapus'
        ]);
    }

    /**
     * Get statistics and performance for all sales (for head sales)
     */
    public function statistics(Request $request)
    {
        // Get date range (default: current month)
        $startDate = $request->has('start_date') 
            ? Carbon::parse($request->start_date)->startOfDay()
            : Carbon::now()->startOfMonth();
        
        $endDate = $request->has('end_date')
            ? Carbon::parse($request->end_date)->endOfDay()
            : Carbon::now()->endOfMonth();

        // Get previous period for comparison
        $periodDays = $startDate->diffInDays($endDate) + 1;
        $prevStartDate = $startDate->copy()->subDays($periodDays);
        $prevEndDate = $startDate->copy()->subDay();

        // Get all sales (users with level sales)
        $salesList = User::where('level', '2')
            ->where('status', '!=', 'N')
            ->where('divisi', '3')
            ->select('id', 'nama', 'email', 'level')
            ->orderBy('nama', 'asc')
            ->get();

        $salesStatistics = $salesList->map(function($sales) use ($startDate, $endDate, $prevStartDate, $prevEndDate) {
            // Customer Statistics
            $totalCustomers = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->count();
            
            $newCustomers = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$startDate, $endDate])
                ->count();
            
            $prevNewCustomers = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$prevStartDate, $prevEndDate])
                ->count();

            // Order Statistics
            $totalOrders = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->count();
            
            $ordersThisPeriod = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$startDate, $endDate])
                ->count();
            
            $prevOrders = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$prevStartDate, $prevEndDate])
                ->count();

            // Revenue Statistics
            $totalRevenue = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->where('status_order', '2') // Paid orders
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            $revenueThisPeriod = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->where('status_order', '2')
                ->whereBetween('create_at', [$startDate, $endDate])
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            $prevRevenue = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->where('status_order', '2')
                ->whereBetween('create_at', [$prevStartDate, $prevEndDate])
                ->sum(DB::raw('CAST(total_harga AS numeric)'));

            // Customer yang sudah order
            $customersWithOrders = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereHas('orders')
                ->count();
            
            $customersWithOrdersThisPeriod = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereHas('orders', function($q) use ($startDate, $endDate) {
                    $q->whereBetween('create_at', [$startDate, $endDate]);
                })
                ->count();
            
            $prevCustomersWithOrders = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereHas('orders', function($q) use ($prevStartDate, $prevEndDate) {
                    $q->whereBetween('create_at', [$prevStartDate, $prevEndDate]);
                })
                ->count();

            // Conversion Rates (Customer to Order)
            $customerToOrderRate = $totalCustomers > 0 
                ? round(($customersWithOrders / $totalCustomers) * 100, 2) 
                : 0;
            
            // Average order value
            $avgOrderValue = $totalOrders > 0 
                ? round($totalRevenue / $totalOrders, 2)
                : 0;
            
            $avgOrderValueThisPeriod = $ordersThisPeriod > 0 
                ? round($revenueThisPeriod / $ordersThisPeriod, 2)
                : 0;

            // Growth Calculations
            $customerGrowth = $prevNewCustomers > 0 
                ? round((($newCustomers - $prevNewCustomers) / $prevNewCustomers) * 100, 2)
                : ($newCustomers > 0 ? 100 : 0);
            
            $orderGrowth = $prevOrders > 0 
                ? round((($ordersThisPeriod - $prevOrders) / $prevOrders) * 100, 2)
                : ($ordersThisPeriod > 0 ? 100 : 0);
            
            $revenueGrowth = $prevRevenue > 0 
                ? round((($revenueThisPeriod - $prevRevenue) / $prevRevenue) * 100, 2)
                : ($revenueThisPeriod > 0 ? 100 : 0);
            
            $customerOrderGrowth = $prevCustomersWithOrders > 0 
                ? round((($customersWithOrdersThisPeriod - $prevCustomersWithOrders) / $prevCustomersWithOrders) * 100, 2)
                : ($customersWithOrdersThisPeriod > 0 ? 100 : 0);

            return [
                'sales_id' => $sales->id,
                'sales_nama' => $sales->nama,
                'sales_email' => $sales->email,
                'sales_level' => $sales->level,
                'customers' => [
                    'total' => $totalCustomers,
                    'new_this_period' => $newCustomers,
                    'prev_period' => $prevNewCustomers,
                    'growth' => $customerGrowth,
                    'growth_formatted' => ($customerGrowth >= 0 ? '+' : '') . number_format($customerGrowth, 2) . '%',
                ],
                'orders' => [
                    'total' => $totalOrders,
                    'this_period' => $ordersThisPeriod,
                    'prev_period' => $prevOrders,
                    'growth' => $orderGrowth,
                    'growth_formatted' => ($orderGrowth >= 0 ? '+' : '') . number_format($orderGrowth, 2) . '%',
                ],
                'revenue' => [
                    'total' => (float) $totalRevenue,
                    'total_formatted' => 'Rp ' . number_format($totalRevenue, 0, ',', '.'),
                    'this_period' => (float) $revenueThisPeriod,
                    'this_period_formatted' => 'Rp ' . number_format($revenueThisPeriod, 0, ',', '.'),
                    'prev_period' => (float) $prevRevenue,
                    'prev_period_formatted' => 'Rp ' . number_format($prevRevenue, 0, ',', '.'),
                    'growth' => $revenueGrowth,
                    'growth_formatted' => ($revenueGrowth >= 0 ? '+' : '') . number_format($revenueGrowth, 2) . '%',
                ],
                'customers_with_orders' => [
                    'total' => $customersWithOrders,
                    'this_period' => $customersWithOrdersThisPeriod,
                    'prev_period' => $prevCustomersWithOrders,
                    'growth' => $customerOrderGrowth,
                    'growth_formatted' => ($customerOrderGrowth >= 0 ? '+' : '') . number_format($customerOrderGrowth, 2) . '%',
                ],
                'conversion_rates' => [
                    'customer_to_order' => $customerToOrderRate,
                    'customer_to_order_formatted' => number_format($customerToOrderRate, 2) . '%',
                ],
                'average_order_value' => [
                    'total' => $avgOrderValue,
                    'total_formatted' => 'Rp ' . number_format($avgOrderValue, 0, ',', '.'),
                    'this_period' => $avgOrderValueThisPeriod,
                    'this_period_formatted' => 'Rp ' . number_format($avgOrderValueThisPeriod, 0, ',', '.'),
                ],
            ];
        });

        // Sort by revenue (this period) descending
        $salesStatistics = $salesStatistics->sortByDesc(function($sales) {
            return $sales['revenue']['this_period'];
        })->values();

        return response()->json([
            'success' => true,
            'data' => [
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'prev_start_date' => $prevStartDate->format('Y-m-d'),
                    'prev_end_date' => $prevEndDate->format('Y-m-d'),
                ],
                'statistics' => $salesStatistics,
                'summary' => [
                    'total_sales' => $salesList->count(),
                    'total_customers' => Customer::where('status', '!=', 'N')->count(),
                    'total_orders' => OrderCustomer::where('status', '!=', 'N')->count(),
                    'total_revenue' => OrderCustomer::where('status', '!=', 'N')
                        ->where('status_order', '2')
                        ->sum(DB::raw('CAST(total_harga AS numeric)')),
                ],
            ]
        ]);
    }

    /**
     * Get detailed performance for a specific sales
     */
    public function performance($id, Request $request)
    {
        $sales = User::where('id', $id)
            ->where('level', '2')
            ->where('divisi', '3')
            ->where('status', '!=', 'N')
            ->first();

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan'
            ], 404);
        }

        // Get date range (default: last 30 days)
        $days = $request->get('days', 30);
        $endDate = Carbon::now()->endOfDay();
        $startDate = Carbon::now()->subDays($days - 1)->startOfDay();

        // Daily performance chart
        $dailyPerformance = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $dateStart = $date->copy()->startOfDay();
            $dateEnd = $date->copy()->endOfDay();

            $orders = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$dateStart, $dateEnd])
                ->count();

            $revenue = OrderCustomer::whereHas('customer_rel', function($q) use ($sales) {
                    $q->where('sales_id', $sales->id);
                })
                ->where('status', '!=', 'N')
                ->where('status_order', '2')
                ->whereBetween('create_at', [$dateStart, $dateEnd])
                ->sum(DB::raw('CAST(total_harga AS numeric)'));

            $newCustomers = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$dateStart, $dateEnd])
                ->count();
            
            $customersWithOrders = Customer::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereHas('orders', function($q) use ($dateStart, $dateEnd) {
                    $q->whereBetween('create_at', [$dateStart, $dateEnd]);
                })
                ->count();

            $dailyPerformance[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'orders' => $orders,
                'revenue' => (float) $revenue,
                'new_customers' => $newCustomers,
                'customers_with_orders' => $customersWithOrders,
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'sales' => [
                    'id' => $sales->id,
                    'nama' => $sales->nama,
                    'email' => $sales->email,
                    'level' => $sales->level,
                ],
                'period' => [
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'days' => $days,
                ],
                'daily_performance' => $dailyPerformance,
            ]
        ]);
    }
}

