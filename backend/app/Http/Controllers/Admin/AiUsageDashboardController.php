<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiUsageLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AiUsageDashboardController extends Controller
{
    private function rentang(Request $request): array
    {
        $sampai = $request->get('sampai') ? Carbon::parse($request->get('sampai')) : now();
        $dari = $request->get('dari') ? Carbon::parse($request->get('dari')) : $sampai->copy()->subDays(29);

        return [$dari->format('Y-m-d'), $sampai->format('Y-m-d')];
    }

    /**
     * Ringkasan biaya & token: total, breakdown per fitur, breakdown per hari (untuk grafik).
     */
    public function ringkasan(Request $request)
    {
        [$dari, $sampai] = $this->rentang($request);

        $query = AiUsageLog::whereBetween(\DB::raw('DATE(created_at)'), [$dari, $sampai]);

        $total = (clone $query)->selectRaw('
                COUNT(*) as jumlah_panggilan,
                COALESCE(SUM(input_tokens), 0) as total_input_tokens,
                COALESCE(SUM(output_tokens), 0) as total_output_tokens,
                COALESCE(SUM(estimasi_biaya_usd), 0) as total_biaya_usd,
                COALESCE(SUM(CASE WHEN sukses = false THEN 1 ELSE 0 END), 0) as jumlah_gagal
            ')
            ->first();

        $perFitur = (clone $query)
            ->selectRaw('fitur, COUNT(*) as jumlah_panggilan, COALESCE(SUM(estimasi_biaya_usd), 0) as biaya_usd, COALESCE(SUM(input_tokens + output_tokens), 0) as total_tokens')
            ->groupBy('fitur')
            ->orderByDesc('biaya_usd')
            ->get();

        $perHari = (clone $query)
            ->selectRaw('DATE(created_at) as tanggal, COALESCE(SUM(estimasi_biaya_usd), 0) as biaya_usd, COUNT(*) as jumlah_panggilan')
            ->groupBy('tanggal')
            ->orderBy('tanggal')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'rentang' => ['dari' => $dari, 'sampai' => $sampai],
                'total' => $total,
                'per_fitur' => $perFitur,
                'per_hari' => $perHari,
            ],
        ]);
    }

    /**
     * Daftar log mentah, dipaginasi, buat drill-down dari dashboard.
     */
    public function log(Request $request)
    {
        [$dari, $sampai] = $this->rentang($request);

        $query = AiUsageLog::whereBetween(\DB::raw('DATE(created_at)'), [$dari, $sampai])
            ->when($request->get('fitur'), fn ($q, $fitur) => $q->where('fitur', $fitur))
            ->orderByDesc('id');

        return response()->json([
            'success' => true,
            'data' => $query->paginate(50),
        ]);
    }
}
