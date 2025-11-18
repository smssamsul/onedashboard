<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\LogsFollup;
use App\Models\User;
use App\Models\UserLogin;
use App\Models\Customer;
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

        $today = Carbon::today();

        // Overview statistics
        $totalOrders = OrderCustomer::count();
        $totalOrdersPaid = OrderCustomer::where('status_pembayaran', '1')->count();
        $totalOrdersUnpaid = OrderCustomer::where(function ($query) {
                $query->whereNull('status_pembayaran')
                      ->orWhere('status_pembayaran', '!=', '1');
            })->count();

        $totalCustomers = Customer::count();
        $newCustomersToday = Customer::whereDate('create_at', $today)->count();

        // Total penjualan hari ini (semua sales)
        $totalPenjualanHariIni = OrderCustomer::whereDate('create_at', $today)
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Total penjualan bulan ini (semua sales)
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();
        $totalPenjualanBulanIni = OrderCustomer::whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Chart performa penjualan (30 hari terakhir)
        $salesPerformance = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $total = OrderCustomer::whereDate('create_at', $date)
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            $salesPerformance[] = [
                'date' => $date->format('Y-m-d'),
                'label' => $date->format('d M'),
                'total' => (float) $total
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
                ],
                'overview' => [
                    'orders_total' => $totalOrders,
                    'orders_paid' => $totalOrdersPaid,
                    'orders_unpaid' => $totalOrdersUnpaid,
                    'customers_total' => $totalCustomers,
                    'customers_new_today' => $newCustomersToday,
                ],
                'chart_performa_penjualan' => $salesPerformance,
                'chart_performa_sales' => $salesActivity,
                'riwayat_follow_up' => $lastFollowUps,
                'pembelian_terakhir' => $lastPurchases
            ]
        ]);
    }
}

