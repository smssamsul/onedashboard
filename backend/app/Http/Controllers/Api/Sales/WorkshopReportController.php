<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OrderCustomer;
use App\Models\OrderCustomerArsip;
use App\Models\Produk;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Rekap peserta Workshop per tahun+bulan (pilih satu bulan, tampilkan daftar
 * peserta & detailnya) - dihitung dari OrderCustomer (tahun berjalan) DAN
 * OrderCustomerArsip (tahun-tahun sebelumnya, sebelum ~April 2026 data cuma
 * ada di arsip - lihat CustomerController::combinedOrdersHistory()).
 *
 * Tier ditentukan dari nama bundling order (platinum/gold/silver) untuk data
 * live, atau dari produk id=16 (TP - Reseat Workshop Ternak Properti) untuk
 * Reseat. Data arsip tidak punya kolom bundling - tier cuma bisa ditebak dari
 * kata "reseat" di nama produk arsipnya, sisanya masuk "lainnya".
 */
class WorkshopReportController extends Controller
{
    private const PRODUK_RESEAT_ID = 16;
    private const TIER_KEYS = ['platinum', 'gold', 'silver', 'reseat'];

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /** Semua id produk (live + arsip) yang termasuk program Workshop. */
    private function produkIdsWorkshop()
    {
        return Produk::whereRaw('LOWER(nama) LIKE ?', ['%workshop%'])->pluck('id');
    }

    public function tahunTersedia(Request $request)
    {
        $produkIds = $this->produkIdsWorkshop();

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
        $produkIds = $this->produkIdsWorkshop();

        $peserta = collect();

        // Arsip (tahun sebelum data live tersedia, atau bagian awal 2026).
        $arsipQuery = OrderCustomerArsip::whereIn('produk_id', $produkIds)
            ->where('status_pembayaran', '2')
            ->whereYear('tanggal', $tahun)
            ->whereMonth('tanggal', $bulan)
            ->with('customer:id,nama,wa');
        foreach ($arsipQuery->get() as $o) {
            $peserta->push([
                'order_id' => 'arsip-' . $o->id,
                'customer_id' => $o->customer_id,
                'nama' => $o->customer->nama ?? '(customer tidak ditemukan)',
                'wa' => $o->customer->wa ?? null,
                'tier' => stripos((string) $o->produk_nama_manual, 'reseat') !== false ? 'reseat' : null,
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
                'tier' => $this->resolveTierLive($o),
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
        foreach (self::TIER_KEYS as $t) {
            $grup = $peserta->where('tier', $t);
            $ringkasan['tier'][$t] = ['count' => $grup->count(), 'omzet' => $grup->sum('harga')];
        }
        $lainnya = $peserta->whereNotIn('tier', self::TIER_KEYS);
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

    private function resolveTierLive(OrderCustomer $order): ?string
    {
        if ((int) $order->produk === self::PRODUK_RESEAT_ID) {
            return 'reseat';
        }

        $namaBundling = strtolower(trim($order->bundling_rel->nama ?? ''));
        return in_array($namaBundling, ['platinum', 'gold', 'silver'], true) ? $namaBundling : null;
    }
}
