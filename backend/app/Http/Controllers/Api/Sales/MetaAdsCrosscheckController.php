<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdsAccount;
use App\Models\PixelCheckLog;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MetaAdsCrosscheckController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    private const PURCHASE_ACTION_TYPES = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];

    private function dateRange(Request $request): array
    {
        $end = $request->get('end_date') ? Carbon::parse($request->get('end_date')) : now();
        $start = $request->get('start_date') ? Carbon::parse($request->get('start_date')) : $end->copy()->subDays(29);

        return [$start->format('Y-m-d'), $end->format('Y-m-d')];
    }

    /**
     * Rekonsiliasi harian: berapa event Purchase yang KITA kirim (pixel_check_logs)
     * vs berapa yang DILAPORKAN Meta (meta_ad_insights_daily.raw_actions), per hari.
     *
     * Ini rekonsiliasi AGREGAT, bukan pencocokan 1:1 - Meta tidak expose status
     * "diterima per event" lewat Marketing API (itu cuma ada di UI Events Manager).
     * Selisih itu WAJAR karena attribution window Meta (7-28 hari) beda dari
     * "kita kirim event" - jangan diartikan otomatis sebagai bug tracking.
     */
    public function crosscheck(Request $request)
    {
        if (!MetaAdsAccount::where('is_active', true)->exists()) {
            return response()->json([
                'success' => true,
                'connected' => false,
                'data' => [],
            ]);
        }

        [$start, $end] = $this->dateRange($request);
        $eventName = $request->get('event_name', 'Purchase');

        // Sisi kita: dari pixel_check_logs (status sukses saja)
        $ourData = PixelCheckLog::query()
            ->whereBetween(DB::raw('DATE(create_at)'), [$start, $end])
            ->where('status', '1')
            ->where('event_name', $eventName)
            ->selectRaw('DATE(create_at) as date, COUNT(*) as our_count, COALESCE(SUM(NULLIF(payload->>\'value\', \'\')::numeric), 0) as our_value')
            ->groupBy(DB::raw('DATE(create_at)'))
            ->get()
            ->keyBy(fn ($row) => $row->date);

        // Sisi Meta: dari meta_ad_insights_daily.raw_actions, dijumlahkan semua campaign per hari
        $metaRows = MetaAdInsightDaily::whereBetween('date', [$start, $end])->get();
        $metaData = [];
        foreach ($metaRows as $row) {
            $date = $row->date->format('Y-m-d');
            $metaData[$date] ??= ['meta_count' => 0, 'meta_value' => 0];

            $actions = $row->raw_actions['actions'] ?? [];
            $actionValues = $row->raw_actions['action_values'] ?? [];

            foreach ($actions as $a) {
                if (in_array($a['action_type'] ?? null, self::PURCHASE_ACTION_TYPES, true)) {
                    $metaData[$date]['meta_count'] += (int) ($a['value'] ?? 0);
                }
            }
            foreach ($actionValues as $a) {
                if (in_array($a['action_type'] ?? null, self::PURCHASE_ACTION_TYPES, true)) {
                    $metaData[$date]['meta_value'] += (float) ($a['value'] ?? 0);
                }
            }
        }

        // Gabungkan semua tanggal yang muncul di salah satu sisi
        $allDates = collect(array_unique(array_merge(
            $ourData->keys()->all(),
            array_keys($metaData)
        )))->sort()->values();

        $result = $allDates->map(function ($date) use ($ourData, $metaData) {
            $ours = $ourData->get($date);
            $meta = $metaData[$date] ?? ['meta_count' => 0, 'meta_value' => 0];

            $ourCount = (int) ($ours->our_count ?? 0);
            $metaCount = (int) $meta['meta_count'];
            $deltaCount = $metaCount - $ourCount;
            $deltaPct = $ourCount > 0 ? round(($deltaCount / $ourCount) * 100, 1) : null;

            return [
                'date' => $date,
                'our_count' => $ourCount,
                'our_value' => (float) ($ours->our_value ?? 0),
                'meta_count' => $metaCount,
                'meta_value' => (float) $meta['meta_value'],
                'delta_count' => $deltaCount,
                'delta_pct' => $deltaPct,
                'flagged' => $deltaPct !== null && abs($deltaPct) > 15,
            ];
        });

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => $result,
            'meta' => [
                'event_name' => $eventName,
                'range' => ['start' => $start, 'end' => $end],
                'note' => 'Rekonsiliasi agregat harian, bukan pencocokan per-event. Selisih wajar terjadi karena attribution window Meta (bisa 7-28 hari) berbeda dari waktu kita mengirim event. Saat ini baru level akun/pixel, belum bisa dipecah per-campaign.',
            ],
        ]);
    }

    /**
     * Ringkasan total untuk rentang tanggal yang dipilih.
     */
    public function crosscheckSummary(Request $request)
    {
        $detail = $this->crosscheck($request)->getData(true);

        if (!($detail['connected'] ?? false)) {
            return response()->json(['success' => true, 'connected' => false, 'data' => null]);
        }

        $rows = collect($detail['data']);

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => [
                'total_our_count' => $rows->sum('our_count'),
                'total_meta_count' => $rows->sum('meta_count'),
                'total_our_value' => $rows->sum('our_value'),
                'total_meta_value' => $rows->sum('meta_value'),
                'days_flagged' => $rows->where('flagged', true)->count(),
            ],
        ]);
    }
}
