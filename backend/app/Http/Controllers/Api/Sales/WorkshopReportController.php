<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OrderCustomer;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Rekap omzet Workshop per bulan (per tahun), dipecah per tier
 * (Platinum/Gold/Silver/Reseat) - dihitung dari OrderCustomer produk
 * kategori Workshop (kategori=6) yang status_pembayaran-nya Paid.
 *
 * Tier ditentukan dari nama bundling order (platinum/gold/silver), atau
 * dari produk id=16 (TP - Reseat Workshop Ternak Properti) untuk Reseat -
 * lihat ImportWorkshopExcel yang jadi sumber data historis awal fitur ini.
 */
class WorkshopReportController extends Controller
{
    private const KATEGORI_WORKSHOP_ID = 6;
    private const PRODUK_RESEAT_ID = 16;
    private const TIER_KEYS = ['platinum', 'gold', 'silver', 'reseat'];

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function summary(Request $request)
    {
        $tahun = (string) $request->get('tahun', now()->year);

        $orders = OrderCustomer::where('status', '!=', 'N')
            ->where('status_pembayaran', '2')
            ->whereHas('produk_rel', function ($q) {
                $q->where('kategori', self::KATEGORI_WORKSHOP_ID);
            })
            ->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 4) = ?", [$tahun])
            ->with(['bundling_rel:id,nama', 'produk_rel:id,nama'])
            ->get(['id', 'produk', 'bundling', 'total_harga', 'tanggal']);

        $bulanan = [];
        for ($m = 1; $m <= 12; $m++) {
            $bulanan[$m] = $this->barisBulanKosong($m);
        }

        foreach ($orders as $o) {
            try {
                $bulan = (int) Carbon::parse($o->tanggal)->format('n');
            } catch (\Throwable $e) {
                continue;
            }
            if (!isset($bulanan[$bulan])) {
                continue;
            }

            $harga = (float) preg_replace('/[^\d.]/', '', (string) $o->total_harga);
            $tier = $this->resolveTier($o);

            $bulanan[$bulan]['total_omzet'] += $harga;
            $bulanan[$bulan]['total_peserta']++;
            if ($tier !== null) {
                $bulanan[$bulan]['tier'][$tier]['count']++;
                $bulanan[$bulan]['tier'][$tier]['omzet'] += $harga;
            } else {
                $bulanan[$bulan]['tier_lainnya']['count']++;
                $bulanan[$bulan]['tier_lainnya']['omzet'] += $harga;
            }
        }

        $tahunTersedia = OrderCustomer::where('status', '!=', 'N')
            ->where('status_pembayaran', '2')
            ->whereHas('produk_rel', function ($q) {
                $q->where('kategori', self::KATEGORI_WORKSHOP_ID);
            })
            ->selectRaw("DISTINCT SUBSTRING(CAST(tanggal AS VARCHAR), 1, 4) as tahun")
            ->pluck('tahun')
            ->filter(fn ($t) => is_string($t) && strlen($t) === 4)
            ->sortDesc()
            ->values();

        if ($tahunTersedia->isEmpty()) {
            $tahunTersedia = collect([$tahun]);
        }

        $totalTahun = [
            'omzet' => array_sum(array_column($bulanan, 'total_omzet')),
            'peserta' => array_sum(array_column($bulanan, 'total_peserta')),
        ];
        foreach (self::TIER_KEYS as $t) {
            $totalTahun['tier'][$t] = [
                'count' => array_sum(array_map(fn ($b) => $b['tier'][$t]['count'], $bulanan)),
                'omzet' => array_sum(array_map(fn ($b) => $b['tier'][$t]['omzet'], $bulanan)),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'tahun' => $tahun,
                'tahun_tersedia' => $tahunTersedia,
                'bulanan' => array_values($bulanan),
                'total_tahun' => $totalTahun,
            ],
        ]);
    }

    private function resolveTier(OrderCustomer $order): ?string
    {
        if ((int) $order->produk === self::PRODUK_RESEAT_ID) {
            return 'reseat';
        }

        $namaBundling = strtolower(trim($order->bundling_rel->nama ?? ''));
        return in_array($namaBundling, ['platinum', 'gold', 'silver'], true) ? $namaBundling : null;
    }

    private function barisBulanKosong(int $bulan): array
    {
        $tier = [];
        foreach (self::TIER_KEYS as $t) {
            $tier[$t] = ['count' => 0, 'omzet' => 0];
        }

        return [
            'bulan' => $bulan,
            'total_omzet' => 0,
            'total_peserta' => 0,
            'tier' => $tier,
            'tier_lainnya' => ['count' => 0, 'omzet' => 0],
        ];
    }
}
