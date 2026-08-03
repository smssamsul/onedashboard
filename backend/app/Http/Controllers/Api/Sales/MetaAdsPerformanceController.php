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

        $produkList = Produk::where('status', '!=', 'N')->get(['id', 'nama']);
        $namaProduk = $produkList->pluck('nama', 'id')->all();
        $produkPerCampaign = $this->produkPerCampaign($campaigns, $produkList);
        $agregatOrder = $this->agregatOrderPerCampaign($start, $end, $campaigns, $produkPerCampaign);

        // Kota hanya dipakai untuk label & penanda "dipakai bersama" di UI.
        // Pencocokan order sudah tidak lewat kota lagi.
        $lokasiCampaign = $campaigns->map(fn ($c) => app(LokasiKeywordService::class)->deteksiKota($c->name));
        $jumlahCampaignPerKota = $lokasiCampaign->filter()->countBy();

        $data = $campaigns->map(function ($c) use ($adSetPerCampaign, $produkPerCampaign, $namaProduk, $agregatOrder, $jumlahCampaignPerKota) {
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
