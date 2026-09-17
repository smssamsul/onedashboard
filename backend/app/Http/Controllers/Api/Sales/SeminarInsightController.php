<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Services\SeminarInsightService;
use Illuminate\Http\Request;

/**
 * Ringkasan performa seminar untuk Dashboard - lihat SeminarInsightService
 * utk detail logika & keterbatasan pencocokan lead/produk ke kota.
 */
class SeminarInsightController extends Controller
{
    public function __construct(private SeminarInsightService $service)
    {
        $this->middleware('auth:api');
    }

    public function harian(Request $request)
    {
        $hariIni = now()->toDateString();
        $dari = $request->get('dari', $hariIni);
        $sampai = $request->get('sampai', $hariIni);

        return response()->json([
            'success' => true,
            'data' => [
                'dari' => $dari,
                'sampai' => $sampai,
                'kelompok' => $this->service->ringkasanRentang($dari, $sampai),
            ],
        ]);
    }

    public function leadsVsPeserta(Request $request)
    {
        $sampai = $request->get('sampai', now()->toDateString());
        $dari = $request->get('dari', now()->subDays(29)->toDateString());

        return response()->json([
            'success' => true,
            'data' => $this->service->leadsVsPeserta($dari, $sampai),
        ]);
    }

    public function kendala(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->service->kendalaPerKelompok(),
        ]);
    }
}
