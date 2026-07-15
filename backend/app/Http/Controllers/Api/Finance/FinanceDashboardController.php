<?php

namespace App\Http\Controllers\Api\Finance;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FinanceDashboardController extends Controller
{
    public function index(Request $request)
    {
        // Data dummy untuk Finance Dashboard
        return response()->json([
            'success' => true,
            'data' => [
                'statistik' => [
                    'pendapatan_bulan_ini' => 245000000,
                    'pendapatan_bulan_ini_formatted' => 'Rp 245.000.000',
                    'pengeluaran_bulan_ini' => 185000000,
                    'pengeluaran_bulan_ini_formatted' => 'Rp 185.000.000',
                    'profit_bulan_ini' => 60000000,
                    'profit_bulan_ini_formatted' => 'Rp 60.000.000',
                    'profit_margin' => 24.5,
                ],
                'cashflow' => [
                    'saldo_saat_ini' => 850000000,
                    'saldo_saat_ini_formatted' => 'Rp 850.000.000',
                    'accounts_receivable' => 125000000,
                    'accounts_receivable_formatted' => 'Rp 125.000.000',
                    'accounts_payable' => 45000000,
                    'accounts_payable_formatted' => 'Rp 45.000.000',
                ],
                'laporan' => [
                    'invoice_terbit' => 156,
                    'invoice_lunas' => 142,
                    'invoice_belum_lunas' => 14,
                    'pembayaran_tertunda' => 8,
                ],
                'chart_pendapatan' => [
                    ['label' => 'Jan', 'pendapatan' => 220000000, 'pengeluaran' => 170000000],
                    ['label' => 'Feb', 'pendapatan' => 235000000, 'pengeluaran' => 180000000],
                    ['label' => 'Mar', 'pendapatan' => 210000000, 'pengeluaran' => 165000000],
                    ['label' => 'Apr', 'pendapatan' => 250000000, 'pengeluaran' => 190000000],
                    ['label' => 'Mei', 'pendapatan' => 240000000, 'pengeluaran' => 185000000],
                    ['label' => 'Jun', 'pendapatan' => 245000000, 'pengeluaran' => 185000000],
                ],
                'chart_cashflow' => [
                    ['label' => 'Sen', 'masuk' => 8500000, 'keluar' => 6200000],
                    ['label' => 'Sel', 'masuk' => 9200000, 'keluar' => 5800000],
                    ['label' => 'Rab', 'masuk' => 7800000, 'keluar' => 6500000],
                    ['label' => 'Kam', 'masuk' => 10500000, 'keluar' => 7200000],
                    ['label' => 'Jum', 'masuk' => 9800000, 'keluar' => 6800000],
                ],
                'transaksi_terbaru' => [
                    ['tipe' => 'Pendapatan', 'deskripsi' => 'Penjualan Cluster Mandala', 'jumlah' => 12500000, 'tanggal' => '16 Nov 2025', 'status' => 'Lunas'],
                    ['tipe' => 'Pengeluaran', 'deskripsi' => 'Gaji Karyawan', 'jumlah' => 85000000, 'tanggal' => '15 Nov 2025', 'status' => 'Dibayar'],
                    ['tipe' => 'Pendapatan', 'deskripsi' => 'Penjualan Villa Harmoni', 'jumlah' => 18500000, 'tanggal' => '14 Nov 2025', 'status' => 'Lunas'],
                    ['tipe' => 'Pengeluaran', 'deskripsi' => 'Operasional Marketing', 'jumlah' => 12500000, 'tanggal' => '13 Nov 2025', 'status' => 'Dibayar'],
                ],
            ]
        ]);
    }
}

