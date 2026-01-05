<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\LogsFollup;
use App\Models\User;
use App\Models\UserLogin;
use App\Models\Customer;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesDashboardController extends Controller
{
    public function index(Request $request)
    {
        $userLogin = auth('api')->user();
        
        if (!$userLogin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $userLogin->load('userData');
        $user = $userLogin->userData;
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User data not found'
            ], 404);
        }

        // Jika level 2 (sales biasa), return dashboard sales
        if ($user->divisi == '3' && $user->level == '2') {
            return $this->salesDashboard($user);
        }

        // Jika level 1 (head sales) atau divisi lain, return dashboard head sales

        $today = Carbon::today();

        // Overview statistics
        $totalOrders = OrderCustomer::count();
        $totalOrdersPaid = OrderCustomer::where('status_order', '2')->count();
        $totalOrdersUnpaid = OrderCustomer::where(function ($query) {
                $query->whereNull('status_order')
                      ->orWhere('status_order', '!=', '2');
            })->count();

        // Calculate paid ratio
        $paidRatio = $totalOrders > 0 ? round(($totalOrdersPaid / $totalOrders) * 100, 2) : 0;

        $totalCustomers = Customer::count();
        $newCustomersToday = Customer::whereDate('create_at', $today)->count();

        // Total penjualan hari ini (semua sales)
        $totalPenjualanHariIni = OrderCustomer::where('status_order', '2')
            ->whereDate('create_at', $today)
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Total penjualan bulan ini (semua sales)
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $totalPenjualanBulanIni = OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Penjualan belum paid (status order 1) bulan ini
        $totalPenjualanBelumPaid = OrderCustomer::where('status_order', '1')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Financial Metrics (bulan ini - order yang sudah dibayar/status_order = 2)
        $ordersPaidBulanIni = OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth]);

        // Gross Revenue = total_harga (dari order yang sudah dibayar)
        $grossRevenue = (float) $ordersPaidBulanIni->sum(DB::raw('CAST(total_harga AS numeric)'));
        
        // Shipping Cost = ongkir (dari order yang sudah dibayar)
        $shippingCost = (float) OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(ongkir AS numeric)'));
        
        // Net Revenue = harga (bukan total_harga) dari order yang sudah dibayar
        $netRevenue = (float) OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(harga AS numeric)'));
        
        // Gross Profit = Net Revenue - Shipping Cost (karena belum ada COGS/HPP)
        // $grossProfit = $netRevenue - $shippingCost;
        $grossProfit = $netRevenue;
        
        // Net Profit = Gross Profit (karena belum ada biaya lain selain shipping)
        $netProfit = $grossProfit;

        // Chart performa penjualan (30 hari terakhir)
        $chartSalesPerformance = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $total = OrderCustomer::whereDate('create_at', $date)
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            $chartSalesPerformance[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'total' => (float) $total
            ];
        }

        // Chart perbandingan transaksi dan order (14 hari terakhir)
        $chartTransaksiOrder = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            
            // Total transaksi (penjualan) per hari
            $totalTransaksi = OrderCustomer::where('status_order', '2')
                ->whereDate('create_at', $date)
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            // Total order per hari
            $totalOrder = OrderCustomer::whereDate('create_at', $date)
                ->count();
            
            $paidCount = OrderCustomer::where('status_order', '2')
                ->whereDate('create_at', $date)
                ->count();
            
            $unpaidCount = OrderCustomer::where(function ($query) {
                    $query->whereNull('status_order')
                          ->orWhere('status_order', '!=', '2');
                })
                ->whereDate('create_at', $date)
                ->count();

            $chartTransaksiOrder[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'transaksi' => (float) $totalTransaksi,
                'order' => $totalOrder,
                'paid' => $paidCount,
                'unpaid' => $unpaidCount,
            ];
        }

        // Perbandingan order paid vs unpaid harian (14 hari terakhir) - keep for compatibility
        $orderStatusComparison = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $paidCount = OrderCustomer::where('status_order', '2')
                ->whereDate('create_at', $date)
                ->count();
            $unpaidCount = OrderCustomer::where(function ($query) {
                    $query->whereNull('status_order')
                          ->orWhere('status_order', '!=', '2');
                })
                ->whereDate('create_at', $date)
                ->count();

            $orderStatusComparison[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'paid' => $paidCount,
                'unpaid' => $unpaidCount,
            ];
        }

        // Chart performa sales (7 hari terakhir dengan jumlah order)
        $salesActivity = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $count = OrderCustomer::whereDate('create_at', $date)
                ->count();
            
            $salesActivity[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'count' => $count
            ];
        }

        // Riwayat terakhir follow up (10 terakhir) untuk semua customer
        $customerIds = OrderCustomer::distinct()
            ->pluck('customer')
            ->toArray();

        $lastFollowUps = LogsFollup::with(['customer_rel:id,nama', 'follup_rel:id,nama'])
            ->whereIn('customer', $customerIds)
            ->orderBy('create_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($log) {
                return [
                    'id' => $log->id,
                    'customer' => $log->customer_rel->nama ?? 'Unknown',
                    'keterangan' => $log->keterangan,
                    'follup' => $log->follup_rel->nama ?? 'Unknown',
                    'tanggal' => $log->create_at ? Carbon::parse($log->create_at)->format('d M Y H:i') : null,
                    'status' => $log->status
                ];
            });

        // Pembelian terakhir (10 terakhir)
        $lastPurchases = OrderCustomer::with(['customer_rel:id,nama', 'produk_rel:id,nama'])
            ->orderBy('create_at', 'desc')
            ->limit(10)
            ->get()
            ->map(function($order) {
                $totalHarga = is_numeric($order->total_harga) ? (float) $order->total_harga : (float) str_replace(',', '', $order->total_harga);
                return [
                    'id' => $order->id,
                    'customer' => $order->customer_rel->nama ?? 'Unknown',
                    'produk' => $order->produk_rel->nama ?? 'Unknown',
                    'total_harga' => $totalHarga,
                    'total_harga_formatted' => 'Rp ' . number_format($totalHarga, 0, ',', '.'),
                    'tanggal' => $order->create_at ? Carbon::parse($order->create_at)->format('d M Y H:i') : null,
                    'status' => $order->status,
                    'status_order' => $order->status_order
                ];
            });

        $salesList = User::where('divisi', '3')
            ->where('status', '!=', 'N')
            ->select('id', 'nama', 'email', 'level')
            ->orderBy('nama', 'asc')
            ->get();

        $salesPerformance = $salesList->map(function($sales) use ($startOfMonth, $endOfMonth) {
            $totalLeads = Lead::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->count();
            
            $newLeads = Lead::where('sales_id', $sales->id)
                ->where('status', 'NEW')
                ->count();
            
            $contactedLeads = Lead::where('sales_id', $sales->id)
                ->where('status', 'CONTACTED')
                ->count();
            
            $qualifiedLeads = Lead::where('sales_id', $sales->id)
                ->where('status', 'QUALIFIED')
                ->count();
            
            $convertedLeads = Lead::where('sales_id', $sales->id)
                ->where('status', 'CONVERTED')
                ->count();
            
            $lostLeads = Lead::where('sales_id', $sales->id)
                ->where('status', 'LOST')
                ->count();
            
            $activeLeads = Lead::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereNotIn('status', ['CONVERTED', 'LOST'])
                ->count();

            $conversionRate = $totalLeads > 0 
                ? round(($convertedLeads / $totalLeads) * 100, 2) 
                : 0;

            $leadsThisMonth = Lead::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
                ->count();

            $leadsLastMonth = Lead::where('sales_id', $sales->id)
                ->where('status', '!=', 'N')
                ->whereBetween('create_at', [
                    Carbon::now()->subMonth()->startOfMonth(),
                    Carbon::now()->subMonth()->endOfMonth()
                ])
                ->count();

            $leadsGrowth = $leadsLastMonth > 0 
                ? round((($leadsThisMonth - $leadsLastMonth) / $leadsLastMonth) * 100, 2)
                : ($leadsThisMonth > 0 ? 100 : 0);

            return [
                'sales_id' => $sales->id,
                'sales_nama' => $sales->nama,
                'sales_email' => $sales->email,
                'sales_level' => $sales->level,
                'total_leads' => $totalLeads,
                'new_leads' => $newLeads,
                'contacted_leads' => $contactedLeads,
                'qualified_leads' => $qualifiedLeads,
                'converted_leads' => $convertedLeads,
                'lost_leads' => $lostLeads,
                'active_leads' => $activeLeads,
                'conversion_rate' => $conversionRate,
                'conversion_rate_formatted' => number_format($conversionRate, 2) . '%',
                'leads_this_month' => $leadsThisMonth,
                'leads_last_month' => $leadsLastMonth,
                'leads_growth' => $leadsGrowth,
                'leads_growth_formatted' => ($leadsGrowth >= 0 ? '+' : '') . number_format($leadsGrowth, 2) . '%',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nama' => $user->nama,
                    'email' => $userLogin->email,
                    'divisi' => $user->divisi,
                ],
                'statistik' => [
                    'total_penjualan_hari_ini' => (float) $totalPenjualanHariIni,
                    'total_penjualan_hari_ini_formatted' => 'Rp ' . number_format($totalPenjualanHariIni, 0, ',', '.'),
                    'total_penjualan_bulan_ini' => (float) $totalPenjualanBulanIni,
                    'total_penjualan_bulan_ini_formatted' => 'Rp ' . number_format($totalPenjualanBulanIni, 0, ',', '.'),
                    'total_penjualan_belum_paid' => (float) $totalPenjualanBelumPaid,
                    'total_penjualan_belum_paid_formatted' => 'Rp ' . number_format($totalPenjualanBelumPaid, 0, ',', '.'),
                ],
                'financial' => [
                    'gross_revenue' => $grossRevenue,
                    'gross_revenue_formatted' => 'Rp ' . number_format($grossRevenue, 0, ',', '.'),
                    'shipping_cost' => $shippingCost,
                    'shipping_cost_formatted' => 'Rp ' . number_format($shippingCost, 0, ',', '.'),
                    'net_revenue' => $netRevenue,
                    'net_revenue_formatted' => 'Rp ' . number_format($netRevenue, 0, ',', '.'),
                    'gross_profit' => $grossProfit,
                    'gross_profit_formatted' => 'Rp ' . number_format($grossProfit, 0, ',', '.'),
                    'net_profit' => $netProfit,
                    'net_profit_formatted' => 'Rp ' . number_format($netProfit, 0, ',', '.'),
                ],
                'overview' => [
                    'orders_total' => $totalOrders,
                    'orders_paid' => $totalOrdersPaid,
                    'orders_unpaid' => $totalOrdersUnpaid,
                    'paid_ratio' => $paidRatio,
                    'paid_ratio_formatted' => number_format($paidRatio, 2) . '%',
                    'customers_total' => $totalCustomers,
                    'customers_new_today' => $newCustomersToday,
                ],
                'sales_performance' => $salesPerformance,
                'chart_transaksi_order' => $chartTransaksiOrder,
                'chart_performa_penjualan' => $chartSalesPerformance,
                'chart_status_order' => $orderStatusComparison,
                'chart_performa_sales' => $salesActivity,
                'riwayat_follow_up' => $lastFollowUps,
                'pembelian_terakhir' => $lastPurchases
            ]
        ]);
    }

    /**
     * Dashboard untuk sales biasa (level 2)
     * Menampilkan leads per sales dengan status masing-masing
     */
    private function salesDashboard($user)
    {
        $userId = $user->id;
        
        // Statistik leads per sales
        $totalLeads = Lead::where('sales_id', $userId)
            ->where('status', '!=', 'N')
            ->count();
        
        $newLeads = Lead::where('sales_id', $userId)
            ->where('status', 'NEW')
            ->count();
        
        $contactedLeads = Lead::where('sales_id', $userId)
            ->where('status', 'CONTACTED')
            ->count();
        
        $qualifiedLeads = Lead::where('sales_id', $userId)
            ->where('status', 'QUALIFIED')
            ->count();
        
        $convertedLeads = Lead::where('sales_id', $userId)
            ->where('status', 'CONVERTED')
            ->count();
        
        $lostLeads = Lead::where('sales_id', $userId)
            ->where('status', 'LOST')
            ->count();
        
        $activeLeads = Lead::where('sales_id', $userId)
            ->where('status', '!=', 'N')
            ->whereNotIn('status', ['CONVERTED', 'LOST'])
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'nama' => $user->nama,
                    'divisi' => $user->divisi,
                    'level' => $user->level,
                ],
                'leads_statistics' => [
                    'total_leads' => $totalLeads,
                    'new_leads' => $newLeads,
                    'contacted_leads' => $contactedLeads,
                    'qualified_leads' => $qualifiedLeads,
                    'converted_leads' => $convertedLeads,
                    'lost_leads' => $lostLeads,
                    'active_leads' => $activeLeads,
                ]
            ]
        ]);
    }
}

