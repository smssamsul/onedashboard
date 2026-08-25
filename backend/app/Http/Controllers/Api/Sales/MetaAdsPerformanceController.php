<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MetaAd;
use App\Models\MetaAdsAccount;
use App\Models\MetaAdInsightAdDaily;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdCampaign;
use App\Models\MetaAdSet;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Services\LokasiKeywordService;
use App\Services\AnalisaMetaAdsService;
use App\Jobs\SyncMetaAdsInsightsJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class MetaAdsPerformanceController extends Controller
{
    /** PPN yang ditagihkan Meta di atas biaya iklan. */
    private const PPN_PERSEN = 11;

    /** KPI: tiap campaign (mewakili satu produk) ditargetkan sekian lead per hari. */
    private const TARGET_LEAD_HARIAN = 30;

    /**
     * utm_source yang TIDAK dianggap berasal dari iklan berbayar, jadi ordernya
     * tidak boleh diklaim campaign mana pun:
     *   sosmedtp / sosmedda  postingan sosial media organik
     *   website              pengunjung yang datang sendiri ke situs
     *
     * Sisanya dihitung — termasuk `lpwa` (landing page ke WhatsApp), jalur iklan
     * terbesar kedua yang ordernya tidak pernah membawa utm_campaign.
     *
     * Tambah di sini kalau muncul sumber baru yang bukan iklan.
     */
    private const SUMBER_BUKAN_IKLAN = ['sosmedda', 'sosmedtp', 'website'];

    /**
     * Campaign yang daftar produknya ditentukan manual, menimpa pencocokan
     * otomatis lewat nama. Kunci = nama campaign yang sudah dinormalisasi
     * (huruf kecil, tanpa spasi/tanda baca), isi = daftar produk id.
     *
     * Dipakai kalau pencocokan nama terlalu longgar. Contoh nyata: campaign
     * "Webinar" ikut menyambar "Webinar Ternak Profit - Seminar Saham" — produk
     * seminar saham yang tidak ada hubungannya — plus satu duplikat
     * "Webinar Ternak Properti" (id 39) yang tidak terpakai. Nama produk di
     * sini banyak yang mirip ("Ternak Properti" vs "Ternak Profit" beda satu
     * huruf), jadi tidak ada aturan otomatis yang bisa memisahkannya dengan
     * aman.
     *
     * Daftar kosong berarti campaign itu TIDAK boleh dicocokkan lewat nama
     * produk sama sekali; ordernya hanya bisa masuk lewat utm_campaign.
     */
    private const PRODUK_CAMPAIGN_MANUAL = [
        'webinar' => [40],
    ];

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

        $data = $this->dataCampaign($start, $end, $hanyaAktif);

        return response()->json([
            'success' => true,
            'connected' => true,
            'data' => $data,
            'meta' => [
                'range' => ['start' => $start, 'end' => $end],
                'ppn_persen' => self::PPN_PERSEN,
                'hanya_aktif' => $hanyaAktif,
                'catatan' => 'Order, buyer, dan revenue berasal dari order internal — bukan dari Meta. Order dari sumber non-iklan (' . implode(', ', self::SUMBER_BUKAN_IKLAN) . ') tidak dihitung. Sisanya dicocokkan berurutan: utm_campaign berisi ID campaign Meta, lalu utm_campaign mengandung nama campaign, terakhir nama campaign yang muncul di nama produk yang dibeli. Buyer & revenue mencakup pembayaran yang sudah diapprove finance maupun yang masih menunggu approval, jadi sebagian kecil masih bisa berubah kalau finance menolak. Semua metrik cost-per dan ROAS memakai biaya termasuk PPN ' . self::PPN_PERSEN . '%.',
            ],
        ]);
    }

    /**
     * Daftar campaign + agregat performa (isi yang sama seperti dikembalikan
     * campaigns()) dalam bentuk Collection, dipakai ulang oleh campaigns() dan
     * analisa().
     *
     * @return \Illuminate\Support\Collection<int, array>
     */
    private function dataCampaign(string $start, string $end, bool $hanyaAktif): \Illuminate\Support\Collection
    {
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

        $performa = $this->performaIklan($start, $end);
        $adSetPerCampaign = $this->ringkasanAdSet($campaigns->pluck('id'), $performa['adSet']);
        $iklanPerCampaign = $this->ringkasanIklan($campaigns->pluck('id'), $performa['iklan']);

        $produkList = Produk::where('status', '!=', 'N')->get(['id', 'nama']);
        $namaProduk = $produkList->pluck('nama', 'id')->all();
        $produkPerCampaign = $this->produkPerCampaign($campaigns, $produkList);
        $agregatOrder = $this->agregatOrderPerCampaign($start, $end, $campaigns, $produkPerCampaign);

        // Kota hanya dipakai untuk label & penanda "dipakai bersama" di UI.
        // Pencocokan order sudah tidak lewat kota lagi.
        $lokasiCampaign = $campaigns->map(fn ($c) => app(LokasiKeywordService::class)->deteksiKota($c->name));
        $jumlahCampaignPerKota = $lokasiCampaign->filter()->countBy();

        $data = $campaigns->map(function ($c) use ($adSetPerCampaign, $iklanPerCampaign, $produkPerCampaign, $namaProduk, $agregatOrder, $jumlahCampaignPerKota) {
            $spend = (float) $c->spend;
            $spendPpn = round($spend * (1 + self::PPN_PERSEN / 100), 2);

            $impressions = (int) $c->impressions;
            $leads = (int) $c->leads;
            $contact = (int) $c->contact;
            $purchase = (int) $c->conversions;

            $kota = app(LokasiKeywordService::class)->deteksiKota($c->name);
            $produkIds = $produkPerCampaign[$c->id] ?? [];

            $agg = $agregatOrder[$c->id] ?? ['order' => 0, 'buyer' => 0, 'revenue' => 0.0, 'dari_utm' => 0, 'dari_produk' => 0];
            $order = (int) $agg['order'];
            $buyer = (int) $agg['buyer'];
            $revenue = (float) $agg['revenue'];

            return [
                'id' => $c->id,
                'campaign_id' => $c->campaign_id,
                'name' => $c->name,
                'status' => $c->status,
                'objective' => $c->objective,
                'daily_budget' => $c->daily_budget !== null ? (float) $c->daily_budget : null,
                'lifetime_budget' => $c->lifetime_budget !== null ? (float) $c->lifetime_budget : null,

                'ad_sets' => $adSetPerCampaign[$c->id] ?? [],
                'iklan' => $iklanPerCampaign[$c->id] ?? [],

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
                // Purchase datang dari Meta, order dari sistem internal. Keduanya
                // dibandingkan ke leads yang sama supaya selisih keduanya kelihatan.
                'rasio_lead_to_order' => $leads > 0 ? round(($order / $leads) * 100, 2) : null,
                'rasio_order_to_buyer' => $order > 0 ? round(($buyer / $order) * 100, 2) : null,

                'lokasi' => $kota,
                'produk_terkait' => array_values(array_map(
                    fn ($id) => ['id' => $id, 'nama' => $namaProduk[$id] ?? null],
                    $produkIds
                )),
                // Kalau satu kota diiklankan >1 campaign, order kota itu terhitung
                // di tiap campaign — ditandai supaya tidak dibaca sebagai angka bersih.
                'lokasi_dipakai_bersama' => $kota ? (($jumlahCampaignPerKota[$kota] ?? 0) > 1) : false,
                // Dari mana order ini dicocokkan. Lewat UTM berarti order membawa
                // jejak campaign asalnya (bukti langsung); lewat produk berarti
                // ditebak dari kesamaan nama campaign dengan nama produk yang
                // dibeli. Dipisah supaya pembaca tahu mana yang bisa dipercaya.
                'order_dari_utm' => (int) $agg['dari_utm'],
                'order_dari_produk' => (int) $agg['dari_produk'],
            ];
        });

        return $data;
    }

    /**
     * Analisa AI (tombol manual "Analisa dengan AI") atas data yang sama
     * seperti campaigns(), dilengkapi baris TOTAL yang dihitung ulang di sini
     * (bukan dijumlah oleh Claude) supaya tidak boros token dan tidak salah
     * hitung. Hasil di-cache 1 jam per kombinasi filter + checksum angka total,
     * supaya sync baru otomatis membatalkan cache lama meski TTL belum habis.
     */
    public function analisa(Request $request, AnalisaMetaAdsService $service)
    {
        if (!$this->hasConnectedAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada akun Meta Ads yang terhubung.',
            ]);
        }

        [$start, $end] = $this->dateRange($request);
        $hanyaAktif = strtolower((string) $request->get('status', 'active')) !== 'all';
        $jumlahHari = Carbon::parse($start)->diffInDays(Carbon::parse($end)) + 1;

        $campaigns = $this->dataCampaign($start, $end, $hanyaAktif);

        if ($campaigns->isEmpty()) {
            return response()->json([
                'success' => false,
                'message' => 'Tidak ada data campaign untuk rentang/filter ini.',
            ]);
        }

        $total = $this->hitungTotalCampaign($campaigns, $jumlahHari);

        $campaignsUntukAi = $campaigns->map(function ($c) use ($jumlahHari) {
            $c['lead_per_hari'] = $jumlahHari > 0 ? round($c['leads'] / $jumlahHari, 2) : null;
            $c['target_lead_per_hari'] = self::TARGET_LEAD_HARIAN;

            return $c;
        })->all();

        // Checksum angka total: kalau sync baru mengubah data dalam jam yang
        // sama, cache lama otomatis tidak terpakai walau TTL belum habis.
        $checksum = md5(json_encode([
            $total['spend'], $total['leads'], $total['order'], $total['buyer'], $total['revenue'],
        ]));
        $cacheKey = 'meta-ads-analisa:' . md5($start . '|' . $end . '|' . ($hanyaAktif ? 'active' : 'all') . '|' . $checksum);
        $sudahAdaCache = Cache::has($cacheKey);

        try {
            $payload = Cache::remember($cacheKey, 3600, function () use ($service, $campaignsUntukAi, $total, $jumlahHari) {
                $hasil = $service->analisa($campaignsUntukAi, $total, $jumlahHari);

                return [
                    'data' => $hasil['data'],
                    'generated_at' => now()->toIso8601String(),
                ];
            });
        } catch (\Throwable $e) {
            Log::channel('ai')->error('MetaAdsPerformanceController::analisa gagal', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Analisa AI sedang tidak tersedia, coba lagi nanti.',
            ]);
        }

        return response()->json([
            'success' => true,
            'cached' => $sudahAdaCache,
            'generated_at' => $payload['generated_at'],
            'data' => $payload['data'],
        ]);
    }

    /**
     * Baris TOTAL yang di frontend (`totalTabel`) dihitung dari campaign yang
     * benar-benar tampil di tabel, bukan dirata-rata per baris. Direplikasi di
     * sini supaya AI tidak perlu (dan tidak boleh diandalkan) menjumlahkan
     * sendiri baris-baris campaign.
     */
    private function hitungTotalCampaign(\Illuminate\Support\Collection $campaigns, int $jumlahHari): array
    {
        $jml = fn (string $kunci) => $campaigns->sum($kunci);

        $spend = $jml('spend');
        $spendPpn = $jml('spend_ppn');
        $impressions = $jml('impressions');
        $leads = $jml('leads');
        $contact = $jml('contact');
        $purchase = $jml('purchase');
        $order = $jml('order');
        $buyer = $jml('buyer');
        $revenue = $jml('revenue');
        $jumlahCampaign = $campaigns->count();

        return [
            'name' => 'TOTAL (semua campaign)',
            'status' => null,
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
            'rasio_lead_to_purchase' => $leads > 0 ? round(($purchase / $leads) * 100, 2) : null,
            'rasio_lead_to_order' => $leads > 0 ? round(($order / $leads) * 100, 2) : null,
            'rasio_order_to_buyer' => $order > 0 ? round(($buyer / $order) * 100, 2) : null,
            'lead_per_hari' => $jumlahHari > 0 ? round($leads / $jumlahHari, 2) : null,
            'target_lead_per_hari' => self::TARGET_LEAD_HARIAN * $jumlahCampaign,
            'jumlah_campaign' => $jumlahCampaign,
        ];
    }

    /**
     * Ringkasan singkat setting ad set per campaign (untuk baris detail di tabel).
     *
     * @return array<int, array<int, array>>  id campaign lokal => daftar ad set
     */
    private function ringkasanAdSet($campaignIds, array $performaAdSet = []): array
    {
        if (count($campaignIds) === 0) {
            return [];
        }

        return MetaAdSet::whereIn('meta_ad_campaign_id', $campaignIds)
            ->orderBy('name')
            ->get()
            ->groupBy('meta_ad_campaign_id')
            ->map(fn ($rows) => $rows->map(fn ($s) => array_merge([
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
            ], $performaAdSet[$s->ad_set_id] ?? $this->performaKosong()))->values()->all())
            ->all();
    }

    /** Bentuk metrik saat sebuah iklan/ad set belum punya baris insight sama sekali. */
    private function performaKosong(): array
    {
        return [
            'spend' => 0.0,
            'spend_ppn' => 0.0,
            'impressions' => 0,
            'clicks' => 0,
            'link_clicks' => 0,
            'leads' => 0,
            'contact' => 0,
            'ctr' => null,
            'cpl' => null,
            'cpm' => null,
            'ada_data' => false,
        ];
    }

    /**
     * Agregat insight level-iklan untuk rentang tanggal, dikembalikan dalam tiga
     * bentuk sekaligus: per iklan, per ad set, dan daftar iklan per campaign.
     *
     * Angka ad set dijumlahkan dari iklan-iklan di dalamnya — bukan panggilan
     * terpisah ke Meta. CTR dan CPL sengaja dihitung ulang dari total, bukan
     * dirata-rata per hari, dengan alasan yang sama seperti baris TOTAL di tabel.
     *
     * `reach` sengaja tidak diikutkan: nilainya tidak bisa dijumlahkan karena
     * Meta melakukan dedup orang yang sama antar hari dan antar iklan.
     *
     * @return array{iklan: array<string, array>, adSet: array<string, array>}
     */
    private function performaIklan(string $start, string $end): array
    {
        $baris = MetaAdInsightAdDaily::query()
            ->whereBetween('date', [$start, $end])
            ->selectRaw('ad_id, ad_set_id')
            ->selectRaw('SUM(spend) as spend')
            ->selectRaw('SUM(impressions) as impressions')
            ->selectRaw('SUM(clicks) as clicks')
            ->selectRaw('SUM(COALESCE(link_clicks, 0)) as link_clicks')
            ->selectRaw('SUM(COALESCE(leads, 0)) as leads')
            ->selectRaw('SUM(COALESCE(contact, 0)) as contact')
            ->groupBy('ad_id', 'ad_set_id')
            ->get();

        $bentuk = function ($spend, $impressions, $clicks, $linkClicks, $leads, $contact) {
            $spend = (float) $spend;
            $spendPpn = round($spend * (1 + self::PPN_PERSEN / 100), 2);
            $impressions = (int) $impressions;

            return [
                'spend' => $spend,
                'spend_ppn' => $spendPpn,
                'impressions' => $impressions,
                'clicks' => (int) $clicks,
                'link_clicks' => (int) $linkClicks,
                'leads' => (int) $leads,
                'contact' => (int) $contact,
                'ctr' => $impressions > 0 ? round(((int) $clicks / $impressions) * 100, 2) : null,
                'cpl' => $this->bagi($spendPpn, (int) $leads),
                'cpm' => $impressions > 0 ? round(($spendPpn / $impressions) * 1000, 2) : null,
                'ada_data' => true,
            ];
        };

        $perIklan = [];
        $totalAdSet = [];

        foreach ($baris as $b) {
            $perIklan[$b->ad_id] = $bentuk($b->spend, $b->impressions, $b->clicks, $b->link_clicks, $b->leads, $b->contact);

            $kunci = $b->ad_set_id ?? '(tanpa ad set)';
            $totalAdSet[$kunci] ??= ['spend' => 0, 'impressions' => 0, 'clicks' => 0, 'link_clicks' => 0, 'leads' => 0, 'contact' => 0];
            $totalAdSet[$kunci]['spend'] += (float) $b->spend;
            $totalAdSet[$kunci]['impressions'] += (int) $b->impressions;
            $totalAdSet[$kunci]['clicks'] += (int) $b->clicks;
            $totalAdSet[$kunci]['link_clicks'] += (int) $b->link_clicks;
            $totalAdSet[$kunci]['leads'] += (int) $b->leads;
            $totalAdSet[$kunci]['contact'] += (int) $b->contact;
        }

        $perAdSet = [];
        foreach ($totalAdSet as $adSetId => $t) {
            $perAdSet[$adSetId] = $bentuk($t['spend'], $t['impressions'], $t['clicks'], $t['link_clicks'], $t['leads'], $t['contact']);
        }

        return ['iklan' => $perIklan, 'adSet' => $perAdSet];
    }

    /**
     * Daftar iklan per campaign, sudah digabung dengan performanya dan diurutkan
     * dari yang paling banyak menghasilkan lead — pertanyaan yang mau dijawab
     * panel ini memang "iklan mana yang jalan".
     *
     * @return array<int, array>  campaign id lokal => daftar iklan
     */
    private function ringkasanIklan($campaignIds, array $performaIklan): array
    {
        if (count($campaignIds) === 0) {
            return [];
        }

        return MetaAd::query()
            ->join('meta_ad_sets', 'meta_ads.meta_ad_set_id', '=', 'meta_ad_sets.id')
            ->whereIn('meta_ad_sets.meta_ad_campaign_id', $campaignIds)
            ->select(
                'meta_ads.ad_id',
                'meta_ads.name',
                'meta_ads.status',
                'meta_ads.creative_payload',
                'meta_ad_sets.ad_set_id',
                'meta_ad_sets.name as ad_set_nama',
                'meta_ad_sets.meta_ad_campaign_id'
            )
            ->get()
            ->groupBy('meta_ad_campaign_id')
            ->map(function ($rows) use ($performaIklan) {
                return $rows
                    ->map(function ($a) use ($performaIklan) {
                        $creative = is_string($a->creative_payload)
                            ? json_decode($a->creative_payload, true)
                            : $a->creative_payload;

                        return array_merge([
                            'ad_id' => $a->ad_id,
                            'name' => $a->name,
                            'status' => $a->status,
                            'ad_set_id' => $a->ad_set_id,
                            'ad_set_nama' => $a->ad_set_nama,
                            'thumbnail' => $creative['thumbnail_url'] ?? null,
                            'judul_materi' => $creative['title'] ?? null,
                        ], $performaIklan[$a->ad_id] ?? $this->performaKosong());
                    })
                    // Lead terbanyak dulu; kalau seri, biaya lebih besar dianggap
                    // lebih penting untuk dilihat.
                    ->sortByDesc(fn ($a) => [$a['leads'], $a['spend']])
                    ->values()
                    ->all();
            })
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
     * Produk yang diiklankan tiap campaign, dicocokkan dari nama campaign yang
     * muncul di nama produk ("Webinar" ada di "Webinar Ternak Properti",
     * "Gorontalo" ada di "Seminar Akuisisi Properti Gorontalo").
     *
     * Menggantikan pemetaan lewat daftar kota. Lebih umum: kota baru tidak perlu
     * didaftarkan dulu, dan campaign non-kota (Webinar, Buku) ikut tertangani —
     * dua hal yang dulu jadi lubang.
     *
     * Nama campaign yang terlalu pendek diabaikan; potongan 3 huruf gampang
     * nyangkut di nama produk yang tidak ada hubungannya.
     *
     * Campaign yang terdaftar di PRODUK_CAMPAIGN_MANUAL memakai daftar itu apa
     * adanya dan tidak ikut pencocokan otomatis.
     *
     * @return array<int, int[]>  campaign id => daftar produk id
     */
    private function produkPerCampaign($campaigns, $produkList): array
    {
        $peta = [];
        $idProdukAktif = $produkList->pluck('id')->map(fn ($id) => (int) $id)->all();

        foreach ($campaigns as $c) {
            $peta[$c->id] = [];
            $nama = $this->normalisasi($c->name);

            if (array_key_exists($nama, self::PRODUK_CAMPAIGN_MANUAL)) {
                // Produk yang sudah dinonaktifkan tetap disaring, supaya daftar
                // manual tidak diam-diam menghidupkan lagi produk berstatus N.
                $peta[$c->id] = array_values(array_intersect(
                    self::PRODUK_CAMPAIGN_MANUAL[$nama],
                    $idProdukAktif
                ));
                continue;
            }

            if (strlen($nama) < 4) {
                continue;
            }

            foreach ($produkList as $p) {
                if (str_contains($this->normalisasi($p->nama), $nama)) {
                    $peta[$c->id][] = (int) $p->id;
                }
            }
        }

        return $peta;
    }

    /**
     * Buang semua karakter selain huruf/angka dan turunkan ke lowercase, supaya
     * "Surabaya" dan "seminar-surabaya" bisa dibandingkan. Nilai utm_campaign
     * ditulis manual oleh yang memasang iklan, jadi bentuknya tidak konsisten.
     */
    private function normalisasi(?string $teks): string
    {
        return preg_replace('/[^a-z0-9]/', '', mb_strtolower((string) $teks));
    }

    /**
     * Agregat order internal per campaign dalam rentang tanggal.
     * Buyer = order yang pembayarannya sudah diapprove finance (status_pembayaran = 2)
     * ATAU sedang menunggu approval (status_pembayaran = 1). Waiting approval ikut
     * dihitung karena buktinya sudah masuk dan tinggal diverifikasi — kalau dibiarkan
     * di luar, campaign yang ordernya baru masuk terlihat mandul padahal cuma sedang
     * antre di finance. Konsekuensinya sebagian kecil bisa berakhir Rejected, jadi
     * angka buyer/revenue di sini sifatnya sementara sampai finance memutuskan.
     * Revenue dihitung hanya dari order buyer tersebut.
     *
     * Tiga lapis pencocokan, dicoba berurutan dari yang paling pasti. Order
     * hanya masuk lewat lapis pertama yang berhasil:
     *
     * 1. `utm_campaign` berisi ID campaign Meta (angka murni). Ini identitas
     *    sesungguhnya, nol ambiguitas.
     *
     * 2. `utm_campaign` mengandung nama campaign ("seminarsurabaya" untuk
     *    campaign "Surabaya"). Masih bukti langsung dari order.
     *
     * 3. Nama produk yang dibeli mengandung nama campaign. Menutup dua kasus:
     *    penamaan utm_campaign yang meleset dari nama campaign ("seminarzoom"
     *    untuk produk "Webinar Ternak Properti" yang diiklankan campaign
     *    "Webinar"), dan sumber trafik yang memang tidak pernah membawa
     *    utm_campaign sama sekali — lihat catatan lpwa di bawah.
     *
     * Lapis 3 menggantikan pencocokan lewat daftar kota, yang punya dua lubang:
     * kota baru harus didaftarkan manual, dan campaign non-kota (Webinar, Buku)
     * mustahil dijangkau.
     *
     * Yang menentukan order boleh dihitung atau tidak adalah utm_source, bukan
     * ada-tidaknya utm_campaign. Sumber terbesar kedua adalah `lpwa` (landing
     * page ke WhatsApp) dengan 181 order dalam 90 hari, dan TIDAK SATU PUN
     * membawa utm_campaign — padahal itu jalur iklan. Menyaring lewat
     * utm_campaign membuang seluruhnya.
     *
     * Yang dibuang justru sumber yang bukan iklan berbayar; lihat
     * SUMBER_BUKAN_IKLAN.
     *
     * @param  array<int, int[]>  $produkPerCampaign  campaign id => produk id
     * @return array<int, array{order: int, buyer: int, revenue: float, dari_utm: int, dari_produk: int}>
     */
    private function agregatOrderPerCampaign(string $start, string $end, $campaigns, array $produkPerCampaign): array
    {
        // Nama campaign ternormalisasi, diurutkan dari yang terpanjang: kalau
        // suatu saat ada campaign "Bandung" dan "Bandung2", yang lebih spesifik
        // yang menang, bukan yang kebetulan diperiksa duluan.
        $polaCampaign = [];
        $idCampaign = [];
        foreach ($campaigns as $c) {
            $nama = $this->normalisasi($c->name);
            if ($nama !== '') {
                $polaCampaign[] = ['id' => $c->id, 'pola' => $nama, 'panjang' => strlen($nama)];
            }
            $idMeta = trim((string) $c->campaign_id);
            if ($idMeta !== '') {
                $idCampaign[$idMeta] = $c->id;
            }
        }
        usort($polaCampaign, fn ($a, $b) => $b['panjang'] <=> $a['panjang']);

        // Dibalik: produk id => daftar campaign id yang mengiklankannya. Satu
        // produk bisa diiklankan lebih dari satu campaign sekaligus.
        $campaignPerProduk = [];
        foreach ($produkPerCampaign as $campaignId => $produkIds) {
            foreach ($produkIds as $produkId) {
                $campaignPerProduk[(int) $produkId][] = $campaignId;
            }
        }

        $hasil = [];
        foreach ($campaigns as $c) {
            $hasil[$c->id] = ['order' => 0, 'buyer' => 0, 'revenue' => 0.0, 'dari_utm' => 0, 'dari_produk' => 0];
        }

        $orders = OrderCustomer::query()
            ->where('status', '!=', 'N')
            ->whereBetween(DB::raw('DATE(create_at)'), [$start, $end])
            ->get(['produk', 'utm_campaign', 'utm_source', 'status_pembayaran', 'total_harga']);

        foreach ($orders as $o) {
            // Order dari sumber non-iklan tidak boleh diklaim campaign mana pun,
            // berapa pun cocoknya nama produk atau UTM-nya.
            if (in_array(strtolower(trim((string) $o->utm_source)), self::SUMBER_BUKAN_IKLAN, true)) {
                continue;
            }

            $utmMentah = trim((string) $o->utm_campaign);
            $utm = $this->normalisasi($o->utm_campaign);

            $cocok = [];
            $sumber = 'dari_utm';

            // Lapis 1: utm berisi ID campaign Meta persis.
            if ($utmMentah !== '' && isset($idCampaign[$utmMentah])) {
                $cocok = [$idCampaign[$utmMentah]];
            }

            // Lapis 2: utm mengandung nama campaign.
            if (!$cocok && $utm !== '') {
                foreach ($polaCampaign as $p) {
                    if (str_contains($utm, $p['pola'])) {
                        $cocok = [$p['id']];
                        break; // pola terpanjang menang; sisanya pasti lebih umum
                    }
                }
            }

            // Lapis 3: nama produk yang dibeli mengandung nama campaign.
            if (!$cocok) {
                $cocok = $campaignPerProduk[(int) $o->produk] ?? [];
                $sumber = 'dari_produk';
            }

            // 2 = Paid (finance approved), 1 = Waiting Approval (bukti sudah masuk,
            // menunggu verifikasi). Unpaid/Rejected/DP tetap di luar.
            $adalahBuyer = in_array((string) $o->status_pembayaran, ['2', '1'], true);
            foreach ($cocok as $campaignId) {
                $hasil[$campaignId]['order']++;
                $hasil[$campaignId][$sumber]++;
                if ($adalahBuyer) {
                    $hasil[$campaignId]['buyer']++;
                    $hasil[$campaignId]['revenue'] += (float) $o->total_harga;
                }
            }
        }

        return $hasil;
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
     * Jalan di background (queue) - Meta Graph API bisa lambat/timeout dan
     * sync 1 akun saja bisa lebih lama dari max_execution_time PHP, jadi
     * request ini cuma dispatch job lalu langsung balas. Progress/hasilnya
     * dibaca lewat syncStatus() (di-polling dari frontend).
     */
    public function sync(Request $request)
    {
        if (!$this->hasConnectedAccount()) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada akun Meta Ads yang terhubung.',
            ], 422);
        }

        $status = Cache::get(SyncMetaAdsInsightsJob::CACHE_KEY);
        if (($status['status'] ?? null) === 'running') {
            return response()->json([
                'success' => false,
                'status' => 'running',
                'message' => 'Sync sebelumnya masih berjalan, tunggu sebentar.',
            ], 409);
        }

        // Batasi rentang biar job-nya gak kelamaan.
        $days = (int) $request->get('days', 30);
        $days = max(1, min($days, 90));

        Cache::put(SyncMetaAdsInsightsJob::CACHE_KEY, [
            'status' => 'pending',
            'message' => 'Sync dijadwalkan...',
            'output' => null,
            'started_at' => null,
            'finished_at' => null,
        ], now()->addHour());

        SyncMetaAdsInsightsJob::dispatch($days);

        return response()->json([
            'success' => true,
            'status' => 'pending',
            'message' => 'Sync dimulai di background.',
        ]);
    }

    /**
     * Status sync yang sedang/baru berjalan (di-polling frontend setelah sync()).
     */
    public function syncStatus(Request $request)
    {
        $status = Cache::get(SyncMetaAdsInsightsJob::CACHE_KEY);

        if (!$status) {
            return response()->json([
                'success' => true,
                'status' => 'idle',
                'message' => null,
            ]);
        }

        return response()->json(array_merge(['success' => true], $status));
    }
}
