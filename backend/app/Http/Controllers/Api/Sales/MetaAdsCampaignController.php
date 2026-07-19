<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Exceptions\MetaAdsApiException;
use App\Models\MetaAdActionLog;
use App\Models\MetaAdCampaign;
use App\Models\MetaAdsAccount;
use App\Services\MetaAdsService;
use Illuminate\Support\Facades\Validator;

class MetaAdsCampaignController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    private function activeAccount()
    {
        return MetaAdsAccount::where('is_active', true)->orderBy('id')->first();
    }

    private function logAction(?MetaAdsAccount $account, ?string $campaignId, string $actionType, $before, $after, string $status, ?string $errorMessage = null): void
    {
        MetaAdActionLog::create([
            'user_id' => auth()->id(),
            'meta_ads_account_id' => $account?->id,
            'campaign_id' => $campaignId,
            'action_type' => $actionType,
            'before_value' => $before,
            'after_value' => $after,
            'status' => $status,
            'error_message' => $errorMessage,
            'create_at' => now(),
        ]);
    }

    public function pause($campaignId)
    {
        $account = $this->activeAccount();
        $campaign = MetaAdCampaign::where('campaign_id', $campaignId)->first();
        $before = ['status' => $campaign->status ?? null];

        try {
            $service = new MetaAdsService($account);
            $service->pauseCampaign($campaignId);

            if ($campaign) {
                $campaign->update(['status' => 'PAUSED', 'update_at' => now()]);
            }

            $this->logAction($account, $campaignId, 'pause', $before, ['status' => 'PAUSED'], 'success');

            return response()->json([
                'success' => true,
                'message' => 'Campaign berhasil di-pause',
            ]);
        } catch (MetaAdsApiException $e) {
            $this->logAction($account, $campaignId, 'pause', $before, null, 'failed', $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'is_auth_error' => $e->isAuthError(),
            ], 422);
        }
    }

    public function resume($campaignId)
    {
        $account = $this->activeAccount();
        $campaign = MetaAdCampaign::where('campaign_id', $campaignId)->first();
        $before = ['status' => $campaign->status ?? null];

        try {
            $service = new MetaAdsService($account);
            $service->resumeCampaign($campaignId);

            if ($campaign) {
                $campaign->update(['status' => 'ACTIVE', 'update_at' => now()]);
            }

            $this->logAction($account, $campaignId, 'resume', $before, ['status' => 'ACTIVE'], 'success');

            return response()->json([
                'success' => true,
                'message' => 'Campaign berhasil diaktifkan kembali',
            ]);
        } catch (MetaAdsApiException $e) {
            $this->logAction($account, $campaignId, 'resume', $before, null, 'failed', $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'is_auth_error' => $e->isAuthError(),
            ], 422);
        }
    }

    public function updateBudget(Request $request, $campaignId)
    {
        $validator = Validator::make($request->all(), [
            'daily_budget' => 'nullable|numeric|min:1',
            'lifetime_budget' => 'nullable|numeric|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!$request->filled('daily_budget') && !$request->filled('lifetime_budget')) {
            return response()->json([
                'success' => false,
                'message' => 'Isi salah satu: daily_budget atau lifetime_budget',
            ], 422);
        }

        $account = $this->activeAccount();
        $campaign = MetaAdCampaign::where('campaign_id', $campaignId)->first();
        $before = ['daily_budget' => $campaign->daily_budget ?? null, 'lifetime_budget' => $campaign->lifetime_budget ?? null];

        try {
            $service = new MetaAdsService($account);
            $service->updateBudget($campaignId, $request->only(['daily_budget', 'lifetime_budget']));

            $after = [];
            if ($campaign) {
                if ($request->filled('daily_budget')) {
                    $campaign->daily_budget = $request->daily_budget;
                    $after['daily_budget'] = $request->daily_budget;
                }
                if ($request->filled('lifetime_budget')) {
                    $campaign->lifetime_budget = $request->lifetime_budget;
                    $after['lifetime_budget'] = $request->lifetime_budget;
                }
                $campaign->update_at = now();
                $campaign->save();
            }

            $this->logAction($account, $campaignId, 'update_budget', $before, $after, 'success');

            return response()->json([
                'success' => true,
                'message' => 'Budget berhasil diupdate',
                'data' => $campaign,
            ]);
        } catch (MetaAdsApiException $e) {
            $this->logAction($account, $campaignId, 'update_budget', $before, null, 'failed', $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'is_auth_error' => $e->isAuthError(),
            ], 422);
        }
    }

    /**
     * Bikin campaign baru dari nol: Campaign -> Ad Set -> Ad, dalam satu alur.
     * Semua dibuat dengan status PAUSED - user wajib aktifkan manual (via Resume)
     * setelah yakin semuanya benar, campaign TIDAK langsung jalan begitu dibuat.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'campaign.name' => 'required|string',
            'campaign.objective' => 'required|string',
            'ad_set.name' => 'required|string',
            'ad_set.daily_budget' => 'required|numeric|min:1',
            'ad_set.optimization_goal' => 'nullable|string',
            'ad_set.billing_event' => 'nullable|string',
            'ad_set.targeting' => 'nullable|array',
            'ad.name' => 'required|string',
            'ad.page_id' => 'required|string',
            'ad.link' => 'required|url',
            'ad.primary_text' => 'nullable|string',
            'ad.headline' => 'nullable|string',
            'ad.image_url' => 'nullable|string',
            'ad.call_to_action' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $account = $this->activeAccount();

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Belum ada akun Meta Ads yang terhubung.',
            ], 422);
        }

        $service = new MetaAdsService($account);
        $campaignId = null;
        $adSetId = null;

        try {
            // 1. Campaign
            $campaignResult = $service->createCampaign($request->input('campaign'));
            $campaignId = $campaignResult['id'];

            MetaAdCampaign::create([
                'meta_ads_account_id' => $account->id,
                'campaign_id' => $campaignId,
                'name' => $request->input('campaign.name'),
                'status' => 'PAUSED',
                'objective' => $request->input('campaign.objective'),
                'raw_payload' => $campaignResult,
                'synced_at' => now(),
                'create_at' => now(),
                'update_at' => now(),
            ]);

            // 2. Ad Set
            $adSetResult = $service->createAdSet($campaignId, $request->input('ad_set'));
            $adSetId = $adSetResult['id'];

            $campaign = MetaAdCampaign::where('campaign_id', $campaignId)->first();
            $campaign->adSets()->create([
                'ad_set_id' => $adSetId,
                'name' => $request->input('ad_set.name'),
                'status' => 'PAUSED',
                'daily_budget' => $request->input('ad_set.daily_budget'),
                'billing_event' => $request->input('ad_set.billing_event', 'IMPRESSIONS'),
                'optimization_goal' => $request->input('ad_set.optimization_goal', 'REACH'),
                'targeting' => $request->input('ad_set.targeting', []),
                'raw_payload' => $adSetResult,
                'synced_at' => now(),
                'create_at' => now(),
                'update_at' => now(),
            ]);

            // 3. Ad (creative)
            $adResult = $service->createAd($adSetId, $request->input('ad'));

            $adSet = $campaign->adSets()->where('ad_set_id', $adSetId)->first();
            $adSet->ads()->create([
                'ad_id' => $adResult['id'],
                'name' => $request->input('ad.name'),
                'status' => 'PAUSED',
                'creative_payload' => $request->input('ad'),
                'raw_payload' => $adResult,
                'synced_at' => now(),
                'create_at' => now(),
                'update_at' => now(),
            ]);

            $this->logAction($account, $campaignId, 'create_campaign', null, $request->all(), 'success');

            return response()->json([
                'success' => true,
                'message' => 'Campaign berhasil dibuat (status PAUSED - aktifkan manual setelah dicek ulang)',
                'data' => [
                    'campaign_id' => $campaignId,
                    'ad_set_id' => $adSetId,
                    'ad_id' => $adResult['id'],
                ],
            ], 201);
        } catch (MetaAdsApiException $e) {
            $this->logAction($account, $campaignId, 'create_campaign', null, $request->all(), 'failed', $e->getMessage());

            // Kasih tau dengan jelas kalau ada bagian yang sudah kebentuk di Meta sebelum error,
            // supaya user gak bingung / gak coba bikin ulang dari awal dan dobel.
            $partial = $campaignId
                ? "Campaign (ID: {$campaignId}" . ($adSetId ? ", Ad Set ID: {$adSetId}" : "") . ") sudah terlanjur dibuat di Meta (status PAUSED) sebelum error ini terjadi - cek/hapus manual di Meta Ads Manager kalau tidak diperlukan."
                : "Belum ada yang terbentuk di Meta.";

            return response()->json([
                'success' => false,
                'message' => $e->getMessage() . ' ' . $partial,
                'is_auth_error' => $e->isAuthError(),
                'partial' => ['campaign_id' => $campaignId, 'ad_set_id' => $adSetId],
            ], 422);
        }
    }
}
