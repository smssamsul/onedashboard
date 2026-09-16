<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OrderCustomer;
use App\Models\OrderCustomerArsip;
use App\Services\WorkshopTierResolver;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Rekap peserta Workshop per tahun+bulan (pilih satu bulan, tampilkan daftar
 * peserta & detailnya) - dihitung dari OrderCustomer (tahun berjalan) DAN
 * OrderCustomerArsip (tahun-tahun sebelumnya, sebelum ~April 2026 data cuma
 * ada di arsip - lihat CustomerController::combinedOrdersHistory()).
 *
 * Resolusi tier lihat WorkshopTierResolver (dipakai bareng dgn
 * CustomerController utk breakdown keanggotaan per tahun).
 */
class WorkshopReportController extends Controller
{
    private WorkshopTierResolver $tierResolver;

    public function __construct(WorkshopTierResolver $tierResolver)
    {
        $this->middleware('auth:api');
        $this->tierResolver = $tierResolver;
    }

    public function tahunTersedia(Request $request)
    {
        $produkIds = $this->tierResolver->produkIds();

        $dariArsip = OrderCustomerArsip::whereIn('produk_id', $produkIds)
            ->where('status_pembayaran', '2')
            ->selectRaw('DISTINCT EXTRACT(YEAR FROM tanggal) as tahun')
            ->pluck('tahun')
            ->map(fn ($t) => (int) $t);

        $dariLive = OrderCustomer::where('status', '!=', 'N')
            ->where('status_pembayaran', '2')
            ->whereIn('produk', $produkIds)
            ->selectRaw("DISTINCT SUBSTRING(CAST(tanggal AS VARCHAR), 1, 4) as tahun")
            ->pluck('tahun')
            ->filter(fn ($t) => is_string($t) && strlen($t) === 4)
            ->map(fn ($t) => (int) $t);

        $tahun = $dariArsip->concat($dariLive)->unique()->sortDesc()->values();
        if ($tahun->isEmpty()) {
            $tahun = collect([(int) now()->year]);
        }

        return response()->json(['success' => true, 'data' => $tahun]);
    }

    public function peserta(Request $request)
    {
        $tahun = (string) $request->get('tahun', now()->year);
        $bulan = (int) $request->get('bulan', now()->month);
        $produkIds = $this->tierResolver->produkIds();

        $peserta = collect();

        // Arsip (tahun sebelum data live tersedia, atau bagian awal 2026).
        $arsipQuery = OrderCustomerArsip::whereIn('produk_id', $produkIds)
            ->where('status_pembayaran', '2')
            ->whereYear('tanggal', $tahun)
            ->whereMonth('tanggal', $bulan)
            ->with('customer:id,nama,wa,keanggotaan');
        foreach ($arsipQuery->get() as $o) {
            $peserta->push([
                'order_id' => 'arsip-' . $o->id,
                'customer_id' => $o->customer_id,
                'nama' => $o->customer->nama ?? '(customer tidak ditemukan)',
                'wa' => $o->customer->wa ?? null,
                'tier' => $this->tierResolver->resolveTierArsip($o),
                'produk_nama' => $o->produk_nama_manual,
                'harga' => (float) preg_replace('/[^\d.]/', '', (string) $o->harga),
                'tanggal' => optional($o->tanggal ? Carbon::parse($o->tanggal) : null)->toDateString(),
                'sumber' => $o->sumber,
                'sumber_data' => 'arsip',
            ]);
        }

        // Live (data berjalan - saat ini cuma relevan mulai 2026).
        $liveQuery = OrderCustomer::where('status', '!=', 'N')
            ->where('status_pembayaran', '2')
            ->whereIn('produk', $produkIds)
            ->whereRaw("SUBSTRING(CAST(tanggal AS VARCHAR), 1, 4) = ?", [$tahun])
            ->with(['customer_rel:id,nama,wa', 'bundling_rel:id,nama', 'produk_rel:id,nama']);
        foreach ($liveQuery->get() as $o) {
            try {
                if ((int) Carbon::parse($o->tanggal)->format('n') !== $bulan) {
                    continue;
                }
            } catch (\Throwable $e) {
                continue;
            }

            $peserta->push([
                'order_id' => $o->id,
                'customer_id' => $o->customer,
                'nama' => $o->customer_rel->nama ?? '(customer tidak ditemukan)',
                'wa' => $o->customer_rel->wa ?? null,
                'tier' => $this->tierResolver->resolveTierLive($o),
                'produk_nama' => $o->produk_rel->nama ?? null,
                'harga' => (float) preg_replace('/[^\d.]/', '', (string) $o->total_harga),
                'tanggal' => optional(Carbon::parse($o->tanggal))->toDateString(),
                'sumber' => $o->sumber,
                'sumber_data' => 'live',
            ]);
        }

        $peserta = $peserta->sortBy('tanggal')->values();

        $ringkasan = [
            'total_peserta' => $peserta->count(),
            'total_omzet' => $peserta->sum('harga'),
            'tier' => [],
        ];
        foreach (WorkshopTierResolver::TIER_KEYS as $t) {
            $grup = $peserta->where('tier', $t);
            $ringkasan['tier'][$t] = ['count' => $grup->count(), 'omzet' => $grup->sum('harga')];
        }
        $lainnya = $peserta->whereNotIn('tier', WorkshopTierResolver::TIER_KEYS);
        $ringkasan['tier_lainnya'] = ['count' => $lainnya->count(), 'omzet' => $lainnya->sum('harga')];

        return response()->json([
            'success' => true,
            'data' => [
                'tahun' => (int) $tahun,
                'bulan' => $bulan,
                'ringkasan' => $ringkasan,
                'peserta' => $peserta,
            ],
        ]);
    }
}
