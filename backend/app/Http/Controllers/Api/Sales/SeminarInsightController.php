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
        $tanggal = $request->get('tanggal', now()->toDateString());

        return response()->json([
            'success' => true,
            'data' => [
                'tanggal' => $tanggal,
                'kelompok' => $this->service->ringkasanHarian($tanggal),
            ],
        ]);
    }

    public function leadsVsPeserta(Request $request)
    {
        return response()->json([
            'success' => true,
            'data' => $this->service->leadsVsPeserta(),
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
