<?php

namespace App\Console\Commands;

use App\Exceptions\MetaAdsApiException;
use App\Models\MetaAdCampaign;
use App\Models\MetaAdInsightDaily;
use App\Models\MetaAdsAccount;
use App\Services\MetaAdsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncMetaAdsInsights extends Command
{
    protected $signature = 'meta-ads:sync-insights {--days=1} {--account=}';

    protected $description = 'Sync campaign metadata + insight harian dari Meta Marketing API ke tabel cache lokal.';

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
                $this->syncInsights($service, $account, $since, $until);

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

    protected function syncInsights(MetaAdsService $service, MetaAdsAccount $account, string $since, string $until): void
    {
        $rows = $service->getAccountInsights($since, $until);

        $count = 0;
        foreach ($rows as $row) {
            [$conversions, $conversionValue] = $this->extractConversions($row);

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
     * Cari action type yang setara "Purchase"/konversi utama dari array `actions`/`action_values` Meta.
     */
    protected function extractConversions(array $row): array
    {
        $purchaseTypes = ['purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];

        $conversions = null;
        $conversionValue = null;

        foreach (($row['actions'] ?? []) as $action) {
            if (in_array($action['action_type'] ?? null, $purchaseTypes, true)) {
                $conversions = (int) ($action['value'] ?? 0);
                break;
            }
        }

        foreach (($row['action_values'] ?? []) as $action) {
            if (in_array($action['action_type'] ?? null, $purchaseTypes, true)) {
                $conversionValue = (float) ($action['value'] ?? 0);
                break;
            }
        }

        return [$conversions, $conversionValue];
    }
}
