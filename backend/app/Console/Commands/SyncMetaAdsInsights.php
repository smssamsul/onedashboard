<?php

namespace App\Console\Commands;

use App\Exceptions\MetaAdsApiException;
use App\Models\MetaAd;
use App\Models\MetaAdCampaign;
use App\Models\MetaAdInsightAdDaily;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdSet;
use App\Models\MetaAdsAccount;
use App\Services\MetaAdsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncMetaAdsInsights extends Command
{
    protected $signature = 'meta-ads:sync-insights {--days=1} {--account=}';

    protected $description = 'Sync campaign metadata + insight harian dari Meta Marketing API ke tabel cache lokal.';

    /**
     * Daftar action_type Meta per metrik, diurut prioritas (paling spesifik dulu).
     * Nilai diambil dari MATCH PERTAMA yang ada supaya tidak dobel hitung
     * (Meta sering mengirim versi granular + versi "grouped" untuk hal yang sama).
     * Sesuaikan urutan/isi di sini kalau definisi bisnisnya berubah.
     */
    protected const PURCHASE_TYPES = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];

    protected const LEAD_TYPES = ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'];

    protected const CONTACT_TYPES = ['contact', 'offsite_conversion.fb_pixel_contact', 'onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection'];

    public function handle(): int
    {
        $days = max(1, (int) $this->option('days'));
        $accountId = $this->option('account');

        $accounts = MetaAdsAccount::query()
            ->where('is_active', true)
            ->when($accountId, fn ($q) => $q->where('id', $accountId))
            ->get();

        if ($accounts->isEmpty()) {
            $this->warn('Belum ada akun Meta Ads aktif untuk di-sync.');
            return self::SUCCESS;
        }

        $since = now()->subDays($days)->format('Y-m-d');
        $until = now()->format('Y-m-d');

        foreach ($accounts as $account) {
            $this->info("=== Sync akun: {$account->nama} ({$account->ad_account_id}) ===");

            try {
                $service = new MetaAdsService($account);

                $this->syncCampaigns($service, $account);
                $this->syncAdSets($service, $account);
                $this->syncAds($service, $account);
                $this->syncInsights($service, $account, $since, $until);
                $this->syncAdInsights($service, $account, $since, $until);

                $account->update(['last_synced_at' => now()]);

                $this->info("Selesai sync akun {$account->nama}.");
            } catch (MetaAdsApiException $e) {
                $this->error("Gagal sync akun {$account->nama}: {$e->getMessage()}");
                Log::error('SyncMetaAdsInsights - gagal untuk akun', [
                    'account_id' => $account->id,
                    'error' => $e->getMessage(),
                    'meta_error_code' => $e->metaErrorCode,
                ]);
                // Lanjut ke akun berikutnya, jangan sampai 1 akun gagal menghentikan semua.
                continue;
            } catch (\Throwable $e) {
                $this->error("Error tak terduga untuk akun {$account->nama}: {$e->getMessage()}");
                Log::error('SyncMetaAdsInsights - exception tak terduga', [
                    'account_id' => $account->id,
                    'error' => $e->getMessage(),
                ]);
                continue;
            }
        }

        return self::SUCCESS;
    }

    protected function syncCampaigns(MetaAdsService $service, MetaAdsAccount $account): void
    {
        $campaigns = $service->getCampaigns();

        foreach ($campaigns as $c) {
            MetaAdCampaign::updateOrCreate(
                ['campaign_id' => $c['id']],
                [
                    'meta_ads_account_id' => $account->id,
                    'name' => $c['name'] ?? null,
                    'status' => $c['status'] ?? null,
                    'objective' => $c['objective'] ?? null,
                    'daily_budget' => isset($c['daily_budget']) ? $c['daily_budget'] / 100 : null,
                    'lifetime_budget' => isset($c['lifetime_budget']) ? $c['lifetime_budget'] / 100 : null,
                    'buying_type' => $c['buying_type'] ?? null,
                    'start_time' => $c['start_time'] ?? null,
                    'stop_time' => $c['stop_time'] ?? null,
                    'raw_payload' => $c,
                    'synced_at' => now(),
                    'update_at' => now(),
                    'create_at' => now(),
                ]
            );
        }

        $this->line('Campaign ter-sync: ' . count($campaigns));
    }

    /**
     * Sync setting ad set (budget, optimization goal, targeting) supaya halaman
     * Overview bisa menampilkan ringkasan setting tanpa memanggil Meta tiap render.
     * Ad set yang campaign-nya belum tersimpan lokal dilewati.
     */
    protected function syncAdSets(MetaAdsService $service, MetaAdsAccount $account): void
    {
        $adSets = $service->getAdSets();

        $campaignMap = MetaAdCampaign::where('meta_ads_account_id', $account->id)
            ->pluck('id', 'campaign_id');

        $count = 0;
        foreach ($adSets as $s) {
            $localCampaignId = $campaignMap[$s['campaign_id'] ?? null] ?? null;
            if (!$localCampaignId) {
                continue;
            }

            MetaAdSet::updateOrCreate(
                ['ad_set_id' => $s['id']],
                [
                    'meta_ad_campaign_id' => $localCampaignId,
                    'name' => $s['name'] ?? null,
                    'status' => $s['status'] ?? null,
                    'daily_budget' => isset($s['daily_budget']) ? $s['daily_budget'] / 100 : null,
                    'lifetime_budget' => isset($s['lifetime_budget']) ? $s['lifetime_budget'] / 100 : null,
                    'billing_event' => $s['billing_event'] ?? null,
                    'optimization_goal' => $s['optimization_goal'] ?? null,
                    'targeting' => $s['targeting'] ?? null,
                    'start_time' => $s['start_time'] ?? null,
                    'end_time' => $s['end_time'] ?? null,
                    'raw_payload' => $s,
                    'synced_at' => now(),
                    'update_at' => now(),
                    'create_at' => now(),
                ]
            );
            $count++;
        }

        $this->line("Ad set ter-sync: {$count}");
    }

    /**
     * Sync daftar iklan (creative) beserta ad set induknya. Iklan yang ad set-nya
     * belum tersimpan lokal dilewati, sama seperti perlakuan ad set terhadap
     * campaign — biar tidak ada baris yatim.
     */
    protected function syncAds(MetaAdsService $service, MetaAdsAccount $account): void
    {
        $ads = $service->getAds();

        $adSetMap = MetaAdSet::whereIn(
            'meta_ad_campaign_id',
            MetaAdCampaign::where('meta_ads_account_id', $account->id)->select('id')
        )->pluck('id', 'ad_set_id');

        // Creative cuma diminta ke Meta untuk ad yang belum punya cache lokal -
        // bukan diulang tiap sync untuk seluruh riwayat akun. Lihat catatan di
        // MetaAdsService::getAdsCreatives().
        $sudahPunyaCreative = MetaAd::whereNotNull('creative_payload')
            ->whereIn('ad_id', array_column($ads, 'id'))
            ->pluck('ad_id')
            ->flip();

        $idsButuhCreative = [];
        foreach ($ads as $a) {
            if (!empty($a['id']) && !isset($sudahPunyaCreative[$a['id']])) {
                $idsButuhCreative[] = $a['id'];
            }
        }

        $creativeMap = $idsButuhCreative ? $service->getAdsCreatives($idsButuhCreative) : [];

        $count = 0;
        foreach ($ads as $a) {
            $localAdSetId = $adSetMap[$a['adset_id'] ?? null] ?? null;
            if (!$localAdSetId) {
                continue;
            }

            $payload = [
                'meta_ad_set_id' => $localAdSetId,
                'name' => $a['name'] ?? null,
                'status' => $a['status'] ?? null,
                'raw_payload' => $a,
                'synced_at' => now(),
                'update_at' => now(),
                'create_at' => now(),
            ];

            // Field creative sengaja tidak disertakan kalau tidak baru diambil,
            // supaya cache yang sudah ada tidak tertimpa null.
            if (array_key_exists($a['id'], $creativeMap)) {
                $payload['creative_id'] = $creativeMap[$a['id']]['id'] ?? null;
                $payload['creative_payload'] = $creativeMap[$a['id']];
            }

            MetaAd::updateOrCreate(['ad_id' => $a['id']], $payload);
            $count++;
        }

        $this->line('Iklan ter-sync: ' . $count . ' dari ' . count($ads) . ' yang dikembalikan Meta');
    }

    /**
     * Insight harian per iklan. Ini sumber angka untuk panel "Performa Iklan"
     * di halaman Overview, sekaligus bahan agregasi ke tingkat ad set.
     */
    protected function syncAdInsights(MetaAdsService $service, MetaAdsAccount $account, string $since, string $until): void
    {
        $rows = $service->getAdInsights($since, $until);

        $count = 0;
        foreach ($rows as $row) {
            if (empty($row['ad_id'])) {
                continue;
            }

            [$conversions, $conversionValue] = $this->extractConversions($row);

            MetaAdInsightAdDaily::updateOrCreate(
                [
                    'ad_id' => $row['ad_id'],
                    'date' => $row['date_start'] ?? $since,
                ],
                [
                    'meta_ads_account_id' => $account->id,
                    'ad_set_id' => $row['adset_id'] ?? null,
                    'campaign_id' => $row['campaign_id'] ?? null,
                    'spend' => $row['spend'] ?? 0,
                    'impressions' => $row['impressions'] ?? 0,
                    'clicks' => $row['clicks'] ?? 0,
                    'link_clicks' => $row['inline_link_clicks'] ?? null,
                    'cpc' => $row['cpc'] ?? null,
                    'cpm' => $row['cpm'] ?? null,
                    'ctr' => $row['ctr'] ?? null,
                    'conversions' => $conversions,
                    'leads' => $this->extractActionCount($row, self::LEAD_TYPES),
                    'contact' => $this->extractActionCount($row, self::CONTACT_TYPES),
                    'conversion_value' => $conversionValue,
                    'raw_actions' => [
                        'actions' => $row['actions'] ?? [],
                        'action_values' => $row['action_values'] ?? [],
                    ],
                    'update_at' => now(),
                    'create_at' => now(),
                ]
            );
            $count++;
        }

        $this->line("Baris insight per-iklan ter-sync: {$count}");
    }

    protected function syncInsights(MetaAdsService $service, MetaAdsAccount $account, string $since, string $until): void
    {
        $rows = $service->getAccountInsights($since, $until);

        $count = 0;
        foreach ($rows as $row) {
            [$conversions, $conversionValue] = $this->extractConversions($row);
            $leads = $this->extractActionCount($row, self::LEAD_TYPES);
            $contact = $this->extractActionCount($row, self::CONTACT_TYPES);

            MetaAdInsightDaily::updateOrCreate(
                [
                    'meta_ads_account_id' => $account->id,
                    'campaign_id' => $row['campaign_id'],
                    'date' => $row['date_start'] ?? $since,
                ],
                [
                    'spend' => $row['spend'] ?? 0,
                    'impressions' => $row['impressions'] ?? 0,
                    'reach' => $row['reach'] ?? 0,
                    'clicks' => $row['clicks'] ?? 0,
                    'link_clicks' => $row['inline_link_clicks'] ?? null,
                    'cpc' => $row['cpc'] ?? null,
                    'cpm' => $row['cpm'] ?? null,
                    'ctr' => $row['ctr'] ?? null,
                    'conversions' => $conversions,
                    'leads' => $leads,
                    'contact' => $contact,
                    'conversion_value' => $conversionValue,
                    'raw_actions' => [
                        'actions' => $row['actions'] ?? [],
                        'action_values' => $row['action_values'] ?? [],
                    ],
                    'update_at' => now(),
                    'create_at' => now(),
                ]
            );
            $count++;
        }

        $this->line("Baris insight ter-sync: {$count}");
    }

    /**
     * Cari jumlah (count) & nilai "Purchase"/konversi utama dari array `actions`/`action_values` Meta.
     */
    protected function extractConversions(array $row): array
    {
        $conversions = $this->extractActionCount($row, self::PURCHASE_TYPES);

        $conversionValue = null;
        foreach (self::PURCHASE_TYPES as $type) {
            foreach (($row['action_values'] ?? []) as $action) {
                if (($action['action_type'] ?? null) === $type) {
                    $conversionValue = (float) ($action['value'] ?? 0);
                    break 2;
                }
            }
        }

        return [$conversions, $conversionValue];
    }

    /**
     * Ambil count dari action_type pertama (menurut urutan prioritas $types) yang ada di baris.
     * Kembalikan null kalau tidak ada satupun yang cocok, biar bisa dibedakan dari 0 asli.
     */
    protected function extractActionCount(array $row, array $types): ?int
    {
        foreach ($types as $type) {
            foreach (($row['actions'] ?? []) as $action) {
                if (($action['action_type'] ?? null) === $type) {
                    return (int) ($action['value'] ?? 0);
                }
            }
        }

        return null;
    }
}
