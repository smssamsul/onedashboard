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
     * Ambil insight harian level-campaign untuk rentang tanggal tertentu.
     * Satu kali panggilan ini mencakup SEMUA campaign di akun (bukan per-campaign),
     * supaya sync tetap ringan walau campaign-nya banyak.
     */
    public function getAccountInsights(string $since, string $until): array
    {
        $response = $this->request('GET', "/{$this->account->ad_account_id}/insights", [
            'level' => 'campaign',
            'time_increment' => 1,
            'time_range' => json_encode(['since' => $since, 'until' => $until]),
            'fields' => 'campaign_id,campaign_name,spend,impressions,reach,clicks,inline_link_clicks,cpc,cpm,ctr,actions,action_values',
            'limit' => 500,
        ]);

        return $response['data'] ?? [];
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
