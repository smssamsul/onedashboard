<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class HRDashboardController extends Controller
{
    public function index(Request $request)
    {
        // Data dummy untuk HR Dashboard
        return response()->json([
            'success' => true,
            'data' => [
                'statistik' => [
                    'total_karyawan' => 156,
                    'karyawan_aktif' => 148,
                    'karyawan_cuti' => 5,
                    'karyawan_resign' => 3,
                    'karyawan_baru_bulan_ini' => 12,
                ],
                'absensi' => [
                    'hadir_hari_ini' => 142,
                    'terlambat_hari_ini' => 6,
                    'tidak_hadir_hari_ini' => 4,
                    'persentase_kehadiran' => 93.4,
                ],
                'rekrutmen' => [
                    'lowongan_aktif' => 8,
                    'kandidat_screening' => 24,
                    'kandidat_interview' => 12,
                    'kandidat_offered' => 5,
                ],
                'training' => [
                    'program_aktif' => 6,
                    'peserta_training' => 89,
                    'training_selesai' => 4,
                    'rata_nilai' => 87.5,
                ],
                'chart_absensi' => [
                    ['label' => 'Sen', 'hadir' => 145, 'tidak_hadir' => 3],
                    ['label' => 'Sel', 'hadir' => 144, 'tidak_hadir' => 4],
                    ['label' => 'Rab', 'hadir' => 146, 'tidak_hadir' => 2],
                    ['label' => 'Kam', 'hadir' => 143, 'tidak_hadir' => 5],
                    ['label' => 'Jum', 'hadir' => 142, 'tidak_hadir' => 6],
                    ['label' => 'Sab', 'hadir' => 45, 'tidak_hadir' => 0],
                    ['label' => 'Min', 'hadir' => 0, 'tidak_hadir' => 0],
                ],
                'chart_rekrutmen' => [
                    ['label' => 'Jan', 'applied' => 45, 'hired' => 8],
                    ['label' => 'Feb', 'applied' => 52, 'hired' => 10],
                    ['label' => 'Mar', 'applied' => 38, 'hired' => 6],
                    ['label' => 'Apr', 'applied' => 61, 'hired' => 12],
                    ['label' => 'Mei', 'applied' => 49, 'hired' => 9],
                    ['label' => 'Jun', 'applied' => 55, 'hired' => 11],
                ],
                'karyawan_terbaru' => [
                    ['nama' => 'Siti Nurhaliza', 'posisi' => 'Sales Manager', 'tanggal_bergabung' => '15 Nov 2025', 'status' => 'Aktif'],
                    ['nama' => 'Budi Santoso', 'posisi' => 'Marketing Specialist', 'tanggal_bergabung' => '12 Nov 2025', 'status' => 'Aktif'],
                    ['nama' => 'Indah Permata', 'posisi' => 'HR Assistant', 'tanggal_bergabung' => '10 Nov 2025', 'status' => 'Aktif'],
                    ['nama' => 'Ahmad Fauzi', 'posisi' => 'Developer', 'tanggal_bergabung' => '08 Nov 2025', 'status' => 'Aktif'],
                ],
            ]
        ]);
    }
}

