<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\HrKaryawan;
use App\Models\HrAbsensi;
use App\Models\HrCuti;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class HRDashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today()->format('Y-m-d');
        $sevenDaysAgo = Carbon::today()->subDays(6)->format('Y-m-d');

        // Statistik karyawan
        $totalKaryawan = HrKaryawan::where('status', '!=', 'N')->count();
        $karyawanAktif = HrKaryawan::where('status', '1')->where('status', '!=', 'N')->count();
        $karyawanResign = HrKaryawan::whereNotNull('tanggal_resign')
            ->where('status', '!=', 'N')
            ->count();

        // Statistik cuti (berdasarkan hr_cuti)
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

        // Chart absensi 7 hari terakhir (berdasarkan tabel hr_absensi)
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

        return response()->json([
            'success' => true,
            'data' => [
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
            ]
        ]);
    }
}

