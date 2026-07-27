<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MetaAdsAccount;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdCampaign;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class MetaAdsPerformanceController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    private function dateRange(Request $request): array
    {
        $end = $request->get('end_date') ? Carbon::parse($request->get('end_date')) : now();
        $start = $request->get('start_date') ? Carbon::parse($request->get('start_date')) : $end->copy()->subDays(29);

        return [$start->format('Y-m-d'), $end->format('Y-m-d')];
    }

    private function hasConnectedAccount(): bool
    {
        return MetaAdsAccount::where('is_active', true)->exists();
    }

    /**
     * Ringkasan harian (buat chart) + total keseluruhan (buat KPI tiles).
     */
    public function overview(Request $request)
    {
        if (!$this->hasConnectedAccount()) {
            return response()->json([
                'success' => true,
                'connected' => false,
                'message' => 'Belum ada akun Meta Ads yang terhubung.',
                'data' => ['daily' => [], 'totals' => null],
            ]);
        }

        [$start, $end] = $this->dateRange($request);

        $daily = MetaAdInsightDaily::query()
            ->whereBetween('date', [$start, $end])
            ->selectRaw('date, SUM(spend) as spend, SUM(impressions) as impressions, SUM(reach) as reach, SUM(clicks) as clicks, SUM(conversions) as conversions, SUM(leads) as leads, SUM(contact) as contact, SUM(conversion_value) as conversion_value')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $totals = MetaAdInsightDaily::query()
            ->whereBetween('date', [$start, $end])
            ->selectRaw('SUM(spend) as spend, SUM(impressions) as impressions, SUM(reach) as reach, SUM(clicks) as clicks, SUM(conversions) as conversions, SUM(leads) as leads, SUM(contact) as contact, SUM(conversion_value) as conversion_value')
            ->first();

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => [
                'daily' => $daily,
                'totals' => $totals,
                'range' => ['start' => $start, 'end' => $end],
            ],
        ]);
    }

    /**
     * Daftar campaign + agregat performa untuk rentang tanggal.
     */
    public function campaigns(Request $request)
    {
        if (!$this->hasConnectedAccount()) {
            return response()->json([
                'success' => true,
                'connected' => false,
                'data' => [],
            ]);
        }

        [$start, $end] = $this->dateRange($request);

        $campaigns = MetaAdCampaign::query()
            ->leftJoin('meta_ad_insights_daily', function ($join) use ($start, $end) {
                $join->on('meta_ad_insights_daily.campaign_id', '=', 'meta_ad_campaigns.campaign_id')
                    ->whereBetween('meta_ad_insights_daily.date', [$start, $end]);
            })
            ->select(
                'meta_ad_campaigns.id',
                'meta_ad_campaigns.campaign_id',
                'meta_ad_campaigns.name',
                'meta_ad_campaigns.status',
                'meta_ad_campaigns.objective',
                'meta_ad_campaigns.daily_budget',
                'meta_ad_campaigns.lifetime_budget'
            )
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.spend), 0) as spend')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.reach), 0) as reach')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.impressions), 0) as impressions')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.clicks), 0) as clicks')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.conversions), 0) as conversions')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.leads), 0) as leads')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.contact), 0) as contact')
            ->selectRaw('COALESCE(SUM(meta_ad_insights_daily.conversion_value), 0) as conversion_value')
            ->groupBy(
                'meta_ad_campaigns.id',
                'meta_ad_campaigns.campaign_id',
                'meta_ad_campaigns.name',
                'meta_ad_campaigns.status',
                'meta_ad_campaigns.objective',
                'meta_ad_campaigns.daily_budget',
                'meta_ad_campaigns.lifetime_budget'
            )
            ->orderByDesc('spend')
            ->get();

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => $campaigns,
        ]);
    }

    /**
     * Breakdown harian untuk satu campaign.
     */
    public function campaignDetail($campaignId, Request $request)
    {
        [$start, $end] = $this->dateRange($request);

        $campaign = MetaAdCampaign::where('campaign_id', $campaignId)->first();

        if (!$campaign) {
            return response()->json([
                'success' => false,
                'message' => 'Campaign tidak ditemukan',
            ], 404);
        }

        $daily = MetaAdInsightDaily::where('campaign_id', $campaignId)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'campaign' => $campaign,
                'daily' => $daily,
            ],
        ]);
    }

    /**
     * Trigger sync manual dari tombol "Sync" di dashboard.
     * Jalan sinkron (nunggu selesai) supaya user langsung dapat hasil/errornya.
     */
    public function sync(Request $request)
    {
        if (!$this->hasConnectedAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada akun Meta Ads yang terhubung.',
            ], 422);
        }

        // Batasi rentang biar request-nya gak kelamaan / timeout.
        $days = (int) $request->get('days', 30);
        $days = max(1, min($days, 90));

        Artisan::call('meta-ads:sync-insights', ['--days' => $days]);
        $output = trim(Artisan::output());

        // Command menangkap error Meta per-akun secara internal dan tetap exit 0,
        // jadi status gagal dideteksi dari teks output biar user tetap dapat feedback.
        $gagal = str_contains($output, 'Gagal sync') || str_contains($output, 'Error tak terduga');

        return response()->json([
            'success' => !$gagal,
            'message' => $gagal
                ? 'Sebagian/seluruh akun gagal di-sync. Cek detail error.'
                : 'Sync selesai. Data performa sudah diperbarui.',
            'output' => $output,
        ], $gagal ? 422 : 200);
    }
}
