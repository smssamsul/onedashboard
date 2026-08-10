<?php

namespace App\Services;

use App\Exceptions\MetaAdsApiException;
use App\Models\MetaAdsAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaAdsService
{
    protected MetaAdsAccount $account;
    protected string $baseUrl;
    protected string $apiVersion;

    public function __construct(?MetaAdsAccount $account = null)
    {
        $resolved = $account ?? MetaAdsAccount::where('is_active', true)->orderBy('id')->first();

        if (!$resolved) {
            throw new MetaAdsApiException('Belum ada akun Meta Ads yang terhubung.');
        }

        $this->account = $resolved;
        $this->baseUrl = rtrim(config('meta_ads.base_url'), '/');
        $this->apiVersion = config('meta_ads.api_version');
    }

    public function account(): MetaAdsAccount
    {
        return $this->account;
    }

    /**
     * Ambil daftar campaign dari akun ini.
     */
    public function getCampaigns(): array
    {
        $response = $this->request('GET', "/{$this->account->ad_account_id}/campaigns", [
            'fields' => 'id,name,status,objective,daily_budget,lifetime_budget,buying_type,start_time,stop_time',
            'limit' => 200,
        ]);

        return $response['data'] ?? [];
    }

    /**
     * Ambil daftar ad set beserta setting-nya (budget, optimization goal, targeting)
     * untuk SEMUA campaign di akun ini sekaligus, biar sync tetap satu panggilan.
     */
    public function getAdSets(): array
    {
        $response = $this->request('GET', "/{$this->account->ad_account_id}/adsets", [
            'fields' => 'id,name,status,campaign_id,daily_budget,lifetime_budget,billing_event,optimization_goal,bid_strategy,targeting,start_time,end_time',
            'limit' => 500,
        ]);

        return $response['data'] ?? [];
    }

    /**
     * Ambil insight harian level-campaign untuk rentang tanggal tertentu.
     * Satu kali panggilan ini mencakup SEMUA campaign di akun (bukan per-campaign),
     * supaya sync tetap ringan walau campaign-nya banyak.
     */
    public function getAccountInsights(string $since, string $until): array
    {
        return $this->requestSemuaHalaman("/{$this->account->ad_account_id}/insights", [
            'level' => 'campaign',
            'time_increment' => 1,
            'time_range' => json_encode(['since' => $since, 'until' => $until]),
            'fields' => 'campaign_id,campaign_name,spend,impressions,reach,clicks,inline_link_clicks,cpc,cpm,ctr,actions,action_values',
            'limit' => 500,
        ]);
    }

    /**
     * Daftar iklan di akun ini, beserta ad set induknya. Sengaja TANPA field
     * `creative{...}` — lihat getAdsCreatives().
     */
    public function getAds(): array
    {
        return $this->requestSemuaHalaman("/{$this->account->ad_account_id}/ads", [
            'fields' => 'id,name,status,adset_id,campaign_id',
            'limit' => 500,
        ]);
    }

    /**
     * Ambil field `creative` untuk sekumpulan ad ID lewat multi-id read
     * (`GET /?ids=...`), dipecah per $chunkSize.
     *
     * Dipisah dari getAds() karena riwayat sempat menunjukkan: meminta
     * `creative{id,thumbnail_url,title,body}` sekaligus untuk SELURUH iklan
     * akun (pagination penuh, ribuan baris) membuat Meta menolak dengan
     * "Please reduce the amount of data you're asking for" (kadang muncul
     * sebagai timeout) begitu jumlah iklan akun bertambah banyak — bahkan
     * setelah limit listing diturunkan ke 100. Caller (syncAds) hanya perlu
     * memanggil ini untuk ad yang belum punya creative_payload tersimpan,
     * bukan seluruh riwayat akun tiap sync.
     */
    public function getAdsCreatives(array $adIds, int $chunkSize = 50): array
    {
        $hasil = [];

        foreach (array_chunk(array_values($adIds), $chunkSize) as $chunk) {
            $response = $this->request('GET', '/', [
                'ids' => implode(',', $chunk),
                'fields' => 'creative{id,thumbnail_url,title,body}',
            ]);

            foreach ($response as $adId => $data) {
                if (isset($data['creative'])) {
                    $hasil[$adId] = $data['creative'];
                }
            }
        }

        return $hasil;
    }

    /**
     * Insight harian level-IKLAN. Sengaja diambil di level terdalam: angka ad set
     * dan campaign bisa dijumlahkan dari sini, tapi tidak sebaliknya. Jadi satu
     * panggilan ini melayani dua tingkat tampilan sekaligus.
     */
    public function getAdInsights(string $since, string $until): array
    {
        return $this->requestSemuaHalaman("/{$this->account->ad_account_id}/insights", [
            'level' => 'ad',
            'time_increment' => 1,
            'time_range' => json_encode(['since' => $since, 'until' => $until]),
            'fields' => 'ad_id,ad_name,adset_id,campaign_id,spend,impressions,clicks,inline_link_clicks,cpc,cpm,ctr,actions,action_values',
            'limit' => 500,
        ]);
    }

    /**
     * Pause campaign (status -> PAUSED).
     */
    public function pauseCampaign(string $campaignId): array
    {
        return $this->request('POST', "/{$campaignId}", ['status' => 'PAUSED']);
    }

    /**
     * Aktifkan lagi campaign yang di-pause (status -> ACTIVE).
     */
    public function resumeCampaign(string $campaignId): array
    {
        return $this->request('POST', "/{$campaignId}", ['status' => 'ACTIVE']);
    }

    /**
     * Update budget campaign. $params: ['daily_budget' => rupiah] atau ['lifetime_budget' => rupiah].
     * Meta API minta budget dalam satuan minor unit (rupiah dikali 100 untuk IDR).
     */
    public function updateBudget(string $campaignId, array $params): array
    {
        $payload = [];
        if (isset($params['daily_budget'])) {
            $payload['daily_budget'] = (int) round($params['daily_budget'] * 100);
        }
        if (isset($params['lifetime_budget'])) {
            $payload['lifetime_budget'] = (int) round($params['lifetime_budget'] * 100);
        }

        return $this->request('POST', "/{$campaignId}", $payload);
    }

    /**
     * Bikin campaign baru. Default status PAUSED demi keamanan -
     * user harus aktifkan manual (lewat Resume) setelah yakin semuanya benar.
     */
    public function createCampaign(array $params): array
    {
        return $this->request('POST', "/{$this->account->ad_account_id}/campaigns", [
            'name' => $params['name'],
            'objective' => $params['objective'],
            'status' => 'PAUSED',
            'special_ad_categories' => json_encode($params['special_ad_categories'] ?? []),
            'buying_type' => $params['buying_type'] ?? 'AUCTION',
        ]);
    }

    /**
     * Bikin ad set baru di bawah campaign tertentu. Default status PAUSED.
     */
    public function createAdSet(string $campaignId, array $params): array
    {
        $payload = [
            'name' => $params['name'],
            'campaign_id' => $campaignId,
            'status' => 'PAUSED',
            'billing_event' => $params['billing_event'] ?? 'IMPRESSIONS',
            'optimization_goal' => $params['optimization_goal'] ?? 'REACH',
            'targeting' => json_encode($params['targeting'] ?? []),
        ];

        if (isset($params['daily_budget'])) {
            $payload['daily_budget'] = (int) round($params['daily_budget'] * 100);
        }
        if (isset($params['lifetime_budget'])) {
            $payload['lifetime_budget'] = (int) round($params['lifetime_budget'] * 100);
        }
        if (!empty($params['start_time'])) {
            $payload['start_time'] = $params['start_time'];
        }

        return $this->request('POST', "/{$this->account->ad_account_id}/adsets", $payload);
    }

    /**
     * Bikin ad (creative + penempatan) baru di bawah ad set tertentu. Default status PAUSED.
     */
    public function createAd(string $adSetId, array $params): array
    {
        $creativeSpec = [
            'name' => ($params['name'] ?? 'Ad') . ' - Creative',
            'object_story_spec' => [
                'page_id' => $params['page_id'],
                'link_data' => [
                    'link' => $params['link'],
                    'message' => $params['primary_text'] ?? '',
                    'name' => $params['headline'] ?? '',
                    'description' => $params['description'] ?? '',
                    'call_to_action' => [
                        'type' => $params['call_to_action'] ?? 'LEARN_MORE',
                        'value' => ['link' => $params['link']],
                    ],
                    'picture' => $params['image_url'] ?? null,
                ],
            ],
        ];

        $creative = $this->request('POST', "/{$this->account->ad_account_id}/adcreatives", [
            'name' => $creativeSpec['name'],
            'object_story_spec' => json_encode($creativeSpec['object_story_spec']),
        ]);

        return $this->request('POST', "/{$this->account->ad_account_id}/ads", [
            'name' => $params['name'],
            'adset_id' => $adSetId,
            'status' => 'PAUSED',
            'creative' => json_encode(['creative_id' => $creative['id']]),
        ]);
    }

    /**
     * Wrapper request ke Graph API dengan timeout, retry, dan normalisasi error Meta.
     */
    /**
     * Sama seperti request() GET, tapi mengikuti `paging.next` sampai habis dan
     * menggabungkan seluruh `data`.
     *
     * Meta memotong hasil di `limit` tanpa memberi tanda apa pun selain adanya
     * kursor `next`. Tanpa ini, sync rentang panjang diam-diam kehilangan baris:
     * insight level-iklan 30 hari gampang menembus ribuan baris.
     *
     * $maxHalaman jadi rem darurat supaya kursor yang rusak tidak bikin loop
     * tak berujung.
     */
    protected function requestSemuaHalaman(string $path, array $params, int $maxHalaman = 50): array
    {
        $semua = [];
        $halaman = 0;

        $response = $this->request('GET', $path, $params);

        while (true) {
            $semua = array_merge($semua, $response['data'] ?? []);
            $halaman++;

            $next = $response['paging']['next'] ?? null;
            if (!$next || $halaman >= $maxHalaman) {
                if ($next) {
                    Log::warning('MetaAdsService - paginasi dihentikan di batas halaman', [
                        'path' => $path,
                        'max_halaman' => $maxHalaman,
                    ]);
                }
                break;
            }

            // Kursor `next` sudah berisi URL lengkap termasuk access_token, jadi
            // dipanggil apa adanya, bukan dirangkai ulang dari $path/$params.
            try {
                $lanjut = Http::timeout(15)->get($next);
            } catch (\Throwable $e) {
                throw new MetaAdsApiException('Gagal mengambil halaman berikutnya: ' . $e->getMessage());
            }

            if (!$lanjut->successful()) {
                throw new MetaAdsApiException(
                    $lanjut->json('error.message') ?? 'Gagal mengambil halaman berikutnya dari Meta.'
                );
            }

            $response = $lanjut->json();
        }

        return $semua;
    }

    protected function request(string $method, string $path, array $params = []): array
    {
        $url = "{$this->baseUrl}/{$this->apiVersion}{$path}";
        $params['access_token'] = $this->account->access_token;

        try {
            $pending = Http::timeout(15)
                ->retry(2, 500, function ($exception) {
                    // Jangan retry kalau errornya soal auth/permission - itu gak akan membaik dengan diulang.
                    return !($exception instanceof \Illuminate\Http\Client\RequestException
                        && in_array(data_get($exception->response?->json(), 'error.code'), [190, 200], true));
                });

            $response = strtoupper($method) === 'GET'
                ? $pending->get($url, $params)
                : $pending->asForm()->post($url, $params);
        } catch (\Throwable $e) {
            Log::error('MetaAdsService - request gagal (network/timeout)', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);
            throw new MetaAdsApiException('Gagal terhubung ke Meta Ads API: ' . $e->getMessage());
        }

        if ($response->successful()) {
            return $response->json();
        }

        $error = $response->json('error') ?? [];
        $message = $error['message'] ?? 'Meta Ads API mengembalikan error tanpa pesan.';
        $code = $error['code'] ?? null;
        $subcode = $error['error_subcode'] ?? null;
        $type = $error['type'] ?? null;

        Log::error('MetaAdsService - Meta API error', [
            'path' => $path,
            'code' => $code,
            'subcode' => $subcode,
            'message' => $message,
        ]);

        throw new MetaAdsApiException($message, $code, $subcode, $type);
    }
}
