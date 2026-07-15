<?php

namespace App\Http\Controllers\Api\Direksi;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\OrderCustomer;
use App\Models\Customer;
use App\Models\Produk;
use App\Models\Lead;
use App\Models\HrKaryawan;
use App\Models\HrAbsensi;
use App\Models\HrCuti;
use App\Models\Percakapan;
use App\Models\LogsFollup;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DireksiDashboardController extends Controller
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

        // Check if user is direksi (level 9 atau divisi 9)
        if (($user->level != '9' && $user->level != 9) && ($user->divisi != '9' && $user->divisi != 9)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - Direksi access only'
            ], 403);
        }

        // Get data from each division's dashboard (same structure as their own dashboards)
        $salesData = $this->getSalesDashboardData();
        $hrData = $this->getHRDashboardData();
        $marketingData = $this->getMarketingDashboardData();
        $itData = $this->getITDashboardData();
        $multimediaData = $this->getMultimediaDashboardData();

        return response()->json([
            'success' => true,
            'data' => [
                'sales' => $salesData,
                'hr' => $hrData,
                'marketing' => $marketingData,
                'it' => $itData,
                'multimedia' => $multimediaData,
            ]
        ]);
    }

    private function getSalesDashboardData()
    {
        // Same logic as SalesDashboardController->index()
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

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

        // Total penjualan hari ini
        $totalPenjualanHariIni = OrderCustomer::where('status_order', '2')
            ->whereDate('create_at', $today)
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Total penjualan bulan ini
        $totalPenjualanBulanIni = OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Penjualan belum paid bulan ini
        $totalPenjualanBelumPaid = OrderCustomer::where('status_order', '1')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        // Financial Metrics
        $ordersPaidBulanIni = OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth]);

        $grossRevenue = (float) $ordersPaidBulanIni->sum(DB::raw('CAST(total_harga AS numeric)'));
        $shippingCost = (float) OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(ongkir AS numeric)'));
        $netRevenue = (float) OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(harga AS numeric)'));
        $grossProfit = $netRevenue;
        $netProfit = $grossProfit;

        // Chart transaksi order (14 hari terakhir)
        $chartTransaksiOrder = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            
            $totalTransaksi = OrderCustomer::where('status_order', '2')
                ->whereDate('create_at', $date)
                ->sum(DB::raw('CAST(total_harga AS numeric)'));
            
            $totalOrder = OrderCustomer::whereDate('create_at', $date)->count();
            
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

        return [
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
            'chart_transaksi_order' => $chartTransaksiOrder,
        ];
    }

    private function getHRDashboardData()
    {
        // Same logic as HRDashboardController->index()
        $today = Carbon::today()->format('Y-m-d');
        $sevenDaysAgo = Carbon::today()->subDays(6)->format('Y-m-d');

        // Statistik karyawan
        $totalKaryawan = HrKaryawan::where('status', '!=', 'N')->count();
        $karyawanAktif = HrKaryawan::where('status', '1')->where('status', '!=', 'N')->count();
        $karyawanResign = HrKaryawan::whereNotNull('tanggal_resign')
            ->where('status', '!=', 'N')
            ->count();

        // Statistik cuti
        $cutiAktif = HrCuti::where('status', '!=', 'N')
            ->where('status_cuti', 'disetujui')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->count();

        $cutiPending = HrCuti::where('status', '!=', 'N')
            ->where('status_cuti', 'pending')
            ->count();

        // Statistik absensi hari ini
        $hadirHariIni = HrAbsensi::where('status', '!=', 'N')
            ->where('tanggal', $today)
            ->where('status_absensi', 'Hadir')
            ->count();

        $telatHariIni = HrAbsensi::where('status', '!=', 'N')
            ->where('tanggal', $today)
            ->where('status_absensi', 'Telat')
            ->count();

        $totalHadirHariIni = HrAbsensi::where('status', '!=', 'N')
            ->where('tanggal', $today)
            ->whereIn('status_absensi', ['Hadir', 'Telat'])
            ->count();

        $persentaseKehadiran = $totalKaryawan > 0
            ? round(($totalHadirHariIni / $totalKaryawan) * 100, 1)
            : 0;

        // Chart absensi 7 hari terakhir
        $chartAbsensiRaw = HrAbsensi::select(
                'tanggal',
                DB::raw("COUNT(CASE WHEN status_absensi = 'Hadir' THEN 1 END) as hadir"),
                DB::raw("COUNT(CASE WHEN status_absensi = 'Telat' THEN 1 END) as telat")
            )
            ->whereBetween('tanggal', [$sevenDaysAgo, $today])
            ->where('status', '!=', 'N')
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();

        $chartAbsensi = $chartAbsensiRaw->map(function ($row) {
            return [
                'label' => $row->tanggal,
                'hadir' => (int) $row->hadir,
                'telat' => (int) $row->telat,
            ];
        });

        // Karyawan terbaru
        $karyawanTerbaru = HrKaryawan::where('status', '!=', 'N')
            ->orderByDesc('create_at')
            ->limit(5)
            ->get(['id', 'nama', 'jabatan', 'departemen', 'tanggal_join', 'status']);

        // Cuti terbaru
        $cutiTerbaru = HrCuti::with(['karyawan_rel', 'type_rel'])
            ->where('status', '!=', 'N')
            ->orderByDesc('create_at')
            ->limit(5)
            ->get();

        return [
            'statistik' => [
                'total_karyawan' => $totalKaryawan,
                'karyawan_aktif' => $karyawanAktif,
                'karyawan_resign' => $karyawanResign,
            ],
            'absensi' => [
                'hadir_hari_ini' => $hadirHariIni,
                'terlambat_hari_ini' => $telatHariIni,
                'persentase_kehadiran' => $persentaseKehadiran,
            ],
            'cuti' => [
                'cuti_aktif_hari_ini' => $cutiAktif,
                'cuti_pending' => $cutiPending,
            ],
            'chart_absensi' => $chartAbsensi,
            'karyawan_terbaru' => $karyawanTerbaru,
            'cuti_terbaru' => $cutiTerbaru,
        ];
    }

    private function getMarketingDashboardData()
    {
        // Marketing dashboard data (similar structure to sales)
        $today = Carbon::today();
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        // Leads (from sales leads table)
        $totalLeads = Lead::where('status', '!=', 'N')->count();
        $newLeadsToday = Lead::whereDate('create_at', $today)
            ->where('status', '!=', 'N')
            ->count();

        $leadsThisMonth = Lead::whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->where('status', '!=', 'N')
            ->count();

        // Penjualan (from orders)
        $totalPenjualan = OrderCustomer::where('status_order', '2')
            ->whereBetween('create_at', [$startOfMonth, $endOfMonth])
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        $penjualanToday = OrderCustomer::where('status_order', '2')
            ->whereDate('create_at', $today)
            ->sum(DB::raw('CAST(total_harga AS numeric)'));

        return [
            'leads' => [
                'total' => $totalLeads,
                'new_today' => $newLeadsToday,
                'this_month' => $leadsThisMonth,
            ],
            'penjualan' => [
                'total_month' => (float) $totalPenjualan,
                'total_month_formatted' => 'Rp ' . number_format($totalPenjualan, 0, ',', '.'),
                'today' => (float) $penjualanToday,
                'today_formatted' => 'Rp ' . number_format($penjualanToday, 0, ',', '.'),
            ],
        ];
    }

    private function getITDashboardData()
    {
        // Dummy data untuk IT - bisa diganti dengan data real jika ada tabel IT
        return [
            'progress_report' => [
                'projects_total' => 12,
                'projects_completed' => 8,
                'projects_in_progress' => 3,
                'projects_pending' => 1,
                'tickets_resolved' => 45,
                'tickets_pending' => 7,
                'systems_uptime' => 99.8,
            ],
        ];
    }

    private function getMultimediaDashboardData()
    {
        // Dummy data untuk Multimedia - bisa diganti dengan data real jika ada tabel multimedia
        return [
            'konten' => [
                'total' => 156,
                'images' => 89,
                'videos' => 12,
                'designs' => 45,
                'animations' => 10,
            ],
            'insight' => [
                'projects_active' => 8,
                'projects_completed' => 24,
                'engagement_rate' => 12.5,
                'views_total' => 125000,
            ],
        ];
    }
}
