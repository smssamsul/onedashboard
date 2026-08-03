<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MetaAdsAccount;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdCampaign;
use App\Models\MetaAdSet;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Services\LokasiKeywordService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

class MetaAdsPerformanceController extends Controller
{
    /** PPN yang ditagihkan Meta di atas biaya iklan. */
    private const PPN_PERSEN = 11;

    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /** Bagi yang aman: pembagi 0/null menghasilkan null, bukan error atau 0 palsu. */
    private function bagi($pembilang, $penyebut): ?float
    {
        $penyebut = (float) $penyebut;
        if ($penyebut == 0.0) {
            return null;
        }

        return round((float) $pembilang / $penyebut, 2);
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
        $hanyaAktif = strtolower((string) $request->get('status', 'active')) !== 'all';

        // Filter status dipakai sama persis seperti di tabel campaign, supaya
        // angka KPI dan grafik selalu cocok dengan isi tabel di bawahnya.
        $base = fn () => MetaAdInsightDaily::query()
            ->whereBetween('date', [$start, $end])
            ->when($hanyaAktif, fn ($q) => $q->whereIn(
                'campaign_id',
                MetaAdCampaign::where('status', 'ACTIVE')->select('campaign_id')
            ));

        $daily = $base()
            ->selectRaw('date, SUM(spend) as spend, SUM(impressions) as impressions, SUM(reach) as reach, SUM(clicks) as clicks, SUM(conversions) as conversions, SUM(leads) as leads, SUM(contact) as contact, SUM(conversion_value) as conversion_value')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        $totals = $base()
            ->selectRaw('SUM(spend) as spend, SUM(impressions) as impressions, SUM(reach) as reach, SUM(clicks) as clicks, SUM(conversions) as conversions, SUM(leads) as leads, SUM(contact) as contact, SUM(conversion_value) as conversion_value')
            ->first();

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => [
                'daily' => $daily,
                'totals' => $totals,
                'range' => ['start' => $start, 'end' => $end],
                'hanya_aktif' => $hanyaAktif,
                'ppn_persen' => self::PPN_PERSEN,
            ],
        ]);
    }

    /**
     * Daftar campaign + agregat performa untuk rentang tanggal.
     *
     * Selain metrik dari Meta (biaya, impresi, leads, contact, purchase),
     * baris campaign juga dilengkapi data order internal — order, buyer, dan
     * revenue — yang ditarik lewat pencocokan keyword lokasi antara nama
     * campaign dan nama produk. Semua metrik cost-per dan ROAS dihitung dari
     * biaya yang sudah termasuk PPN, karena itu uang yang benar-benar keluar.
     *
     * Default hanya campaign berstatus ACTIVE; kirim ?status=all untuk semua.
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
        $hanyaAktif = strtolower((string) $request->get('status', 'active')) !== 'all';

        $campaigns = MetaAdCampaign::query()
            ->when($hanyaAktif, fn ($q) => $q->where('meta_ad_campaigns.status', 'ACTIVE'))
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

        $adSetPerCampaign = $this->ringkasanAdSet($campaigns->pluck('id'));
        [$produkPerKota, $namaProduk] = $this->produkPerKota();
        $orderPerProduk = $this->orderPerProduk($start, $end);

        $lokasiCampaign = $campaigns->map(fn ($c) => app(LokasiKeywordService::class)->deteksiKota($c->name));
        $jumlahCampaignPerKota = $lokasiCampaign->filter()->countBy();

        $data = $campaigns->map(function ($c) use ($adSetPerCampaign, $produkPerKota, $namaProduk, $orderPerProduk, $jumlahCampaignPerKota) {
            $spend = (float) $c->spend;
            $spendPpn = round($spend * (1 + self::PPN_PERSEN / 100), 2);

            $impressions = (int) $c->impressions;
            $leads = (int) $c->leads;
            $contact = (int) $c->contact;
            $purchase = (int) $c->conversions;

            $kota = app(LokasiKeywordService::class)->deteksiKota($c->name);
            $produkIds = $kota ? ($produkPerKota[$kota] ?? []) : [];

            $order = 0;
            $buyer = 0;
            $revenue = 0.0;
            foreach ($produkIds as $produkId) {
                $agg = $orderPerProduk[$produkId] ?? null;
                if (!$agg) {
                    continue;
                }
                $order += (int) $agg['order'];
                $buyer += (int) $agg['buyer'];
                $revenue += (float) $agg['revenue'];
            }

            return [
                'id' => $c->id,
                'campaign_id' => $c->campaign_id,
                'name' => $c->name,
                'status' => $c->status,
                'objective' => $c->objective,
                'daily_budget' => $c->daily_budget !== null ? (float) $c->daily_budget : null,
                'lifetime_budget' => $c->lifetime_budget !== null ? (float) $c->lifetime_budget : null,

                'ad_sets' => $adSetPerCampaign[$c->id] ?? [],

                'spend' => $spend,
                'spend_ppn' => $spendPpn,

                'impressions' => $impressions,
                'cpm' => $this->bagi($spendPpn * 1000, $impressions),

                'leads' => $leads,
                'cpl' => $this->bagi($spendPpn, $leads),

                'contact' => $contact,

                'purchase' => $purchase,
                'cost_per_purchase' => $this->bagi($spendPpn, $purchase),

                'order' => $order,
                'cpo' => $this->bagi($spendPpn, $order),

                'buyer' => $buyer,
                'cpb' => $this->bagi($spendPpn, $buyer),

                'revenue' => round($revenue, 2),
                'roas' => $this->bagi($revenue, $spendPpn),

                // Rasio dalam persen
                'rasio_lead_to_purchase' => $leads > 0 ? round(($purchase / $leads) * 100, 2) : null,
                'rasio_order_to_buyer' => $order > 0 ? round(($buyer / $order) * 100, 2) : null,

                'lokasi' => $kota,
                'produk_terkait' => array_values(array_map(
                    fn ($id) => ['id' => $id, 'nama' => $namaProduk[$id] ?? null],
                    $produkIds
                )),
                // Kalau satu kota diiklankan >1 campaign, order kota itu terhitung
                // di tiap campaign — ditandai supaya tidak dibaca sebagai angka bersih.
                'lokasi_dipakai_bersama' => $kota ? (($jumlahCampaignPerKota[$kota] ?? 0) > 1) : false,
            ];
        });

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => $data,
            'meta' => [
                'range' => ['start' => $start, 'end' => $end],
                'ppn_persen' => self::PPN_PERSEN,
                'hanya_aktif' => $hanyaAktif,
                'catatan' => 'Order, buyer, dan revenue berasal dari order internal yang dicocokkan lewat keyword lokasi pada nama campaign dan nama produk — bukan dari Meta. Semua metrik cost-per dan ROAS memakai biaya termasuk PPN ' . self::PPN_PERSEN . '%.',
            ],
        ]);
    }

    /**
     * Ringkasan singkat setting ad set per campaign (untuk baris detail di tabel).
     *
     * @return array<int, array<int, array>>  id campaign lokal => daftar ad set
     */
    private function ringkasanAdSet($campaignIds): array
    {
        if (count($campaignIds) === 0) {
            return [];
        }

        return MetaAdSet::whereIn('meta_ad_campaign_id', $campaignIds)
            ->orderBy('name')
            ->get()
            ->groupBy('meta_ad_campaign_id')
            ->map(fn ($rows) => $rows->map(fn ($s) => [
                'ad_set_id' => $s->ad_set_id,
                'name' => $s->name,
                'status' => $s->status,
                'daily_budget' => $s->daily_budget !== null ? (float) $s->daily_budget : null,
                'lifetime_budget' => $s->lifetime_budget !== null ? (float) $s->lifetime_budget : null,
                'billing_event' => $s->billing_event,
                'optimization_goal' => $s->optimization_goal,
                'targeting' => $this->ringkasTargeting($s->targeting),
                'start_time' => $s->start_time?->format('Y-m-d'),
                'end_time' => $s->end_time?->format('Y-m-d'),
            ])->values()->all())
            ->all();
    }

    /**
     * Padatkan JSON targeting Meta jadi beberapa baris pendek yang enak dibaca.
     */
    private function ringkasTargeting($targeting): array
    {
        if (!is_array($targeting) || empty($targeting)) {
            return [];
        }

        $ringkas = [];

        $umurMin = $targeting['age_min'] ?? null;
        $umurMax = $targeting['age_max'] ?? null;
        if ($umurMin || $umurMax) {
            $ringkas['umur'] = trim(($umurMin ?? '?') . '-' . ($umurMax ?? '?')) . ' th';
        }

        $genders = $targeting['genders'] ?? [];
        if (!empty($genders)) {
            $peta = [1 => 'Pria', 2 => 'Wanita'];
            $ringkas['gender'] = implode(', ', array_map(fn ($g) => $peta[(int) $g] ?? (string) $g, $genders));
        } else {
            $ringkas['gender'] = 'Semua';
        }

        $geo = $targeting['geo_locations'] ?? [];
        $lokasi = [];
        foreach (($geo['cities'] ?? []) as $kota) {
            $lokasi[] = $kota['name'] ?? null;
        }
        foreach (($geo['regions'] ?? []) as $wilayah) {
            $lokasi[] = $wilayah['name'] ?? null;
        }
        foreach (($geo['countries'] ?? []) as $negara) {
            $lokasi[] = is_string($negara) ? $negara : null;
        }
        $lokasi = array_values(array_filter($lokasi));
        if (!empty($lokasi)) {
            $ringkas['lokasi'] = implode(', ', array_slice($lokasi, 0, 4))
                . (count($lokasi) > 4 ? ' +' . (count($lokasi) - 4) : '');
        }

        $minat = [];
        foreach (($targeting['flexible_spec'] ?? []) as $spec) {
            foreach (($spec['interests'] ?? []) as $i) {
                $minat[] = $i['name'] ?? null;
            }
        }
        foreach (($targeting['interests'] ?? []) as $i) {
            $minat[] = $i['name'] ?? null;
        }
        $minat = array_values(array_unique(array_filter($minat)));
        if (!empty($minat)) {
            $ringkas['minat'] = implode(', ', array_slice($minat, 0, 4))
                . (count($minat) > 4 ? ' +' . (count($minat) - 4) : '');
        }

        $jumlahCustomAudience = count($targeting['custom_audiences'] ?? []);
        if ($jumlahCustomAudience > 0) {
            $ringkas['custom_audience'] = $jumlahCustomAudience . ' audiens';
        }

        $platform = $targeting['publisher_platforms'] ?? [];
        if (!empty($platform)) {
            $ringkas['platform'] = implode(', ', $platform);
        }

        return $ringkas;
    }

    /**
     * Produk aktif dikelompokkan per kota yang terdeteksi dari namanya.
     *
     * @return array{0: array<string, int[]>, 1: array<int, string>}
     */
    private function produkPerKota(): array
    {
        $produkList = Produk::where('status', '!=', 'N')->get(['id', 'nama']);

        return [
            app(LokasiKeywordService::class)->petakanProdukPerKota($produkList),
            $produkList->pluck('nama', 'id')->all(),
        ];
    }

    /**
     * Agregat order internal per produk dalam rentang tanggal.
     * Buyer = order yang pembayarannya sudah diapprove (status_pembayaran = 2),
     * revenue dihitung hanya dari order buyer tersebut.
     *
     * @return array<int, array{order: int, buyer: int, revenue: float}>
     */
    private function orderPerProduk(string $start, string $end): array
    {
        return OrderCustomer::query()
            ->where('status', '!=', 'N')
            ->whereBetween(DB::raw('DATE(create_at)'), [$start, $end])
            ->groupBy('produk')
            ->selectRaw('produk')
            ->selectRaw('COUNT(*) as jumlah_order')
            ->selectRaw("COUNT(*) FILTER (WHERE status_pembayaran = '2') as jumlah_buyer")
            ->selectRaw("COALESCE(SUM(CAST(total_harga AS numeric)) FILTER (WHERE status_pembayaran = '2'), 0) as revenue")
            ->get()
            ->mapWithKeys(fn ($row) => [(int) $row->produk => [
                'order' => (int) $row->jumlah_order,
                'buyer' => (int) $row->jumlah_buyer,
                'revenue' => (float) $row->revenue,
            ]])
            ->all();
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
