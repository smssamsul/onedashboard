<?php

namespace App\Services;

use App\Models\Produk;
use App\Models\Sales;
use Illuminate\Support\Facades\Log;

class SalesRoundRobinService
{
    /**
     * Penentuan sales berikutnya dari kolom assign produk:
     * - assign kosong (0): round-robin ke semua sales
     * - tepat 1 user: langsung ke sales itu (bukan round-robin)
     * - 2 atau lebih: round-robin hanya di antara user yang di-assign
     *
     * @param int|null $produkId null = perlakuan sama seperti produk tanpa assign (semua sales)
     */
    public function getNextSalesId(?int $produkId = null): ?int
    {
        try {
            $assignUserIds = [];
            if ($produkId !== null) {
                $produk = Produk::query()->find($produkId);
                if ($produk) {
                    $assignUserIds = $this->normalizeAssignUserIds($produk->assign);
                }
            }

            $count = count($assignUserIds);

            if ($count === 1) {
                return $this->assignFixedSales($assignUserIds[0]);
            }

            $poolUserIds = $count >= 2 ? $assignUserIds : null;

            return $this->assignRoundRobinFromPool($poolUserIds);
        } catch (\Exception $e) {
            Log::error('SalesRoundRobinService: Error', [
                'message' => $e->getMessage(),
                'produk_id' => $produkId,
            ]);
            return null;
        }
    }

    private function assignFixedSales(int $userId): ?int
    {
        $salesRow = Sales::where('user_id', $userId)->first();
        if (!$salesRow) {
            Log::warning('SalesRoundRobinService: Satu assign tidak ada di pool sales, fallback RR semua', [
                'user_id' => $userId,
            ]);
            return $this->assignRoundRobinFromPool(null);
        }

        $salesRow->update([
            'last_update_lead' => now()->format('Y-m-d H:i:s'),
            'update_at' => now()->format('Y-m-d H:i:s'),
        ]);

        Log::info('SalesRoundRobinService: Produk satu assign — sales tetap', [
            'sales_id' => $userId,
        ]);

        return $userId;
    }

    /**
     * @param int[]|null $poolUserIds null = semua sales; array = whereIn user_id
     */
    private function assignRoundRobinFromPool(?array $poolUserIds): ?int
    {
        $query = Sales::query();
        if ($poolUserIds !== null && count($poolUserIds) >= 2) {
            $query->whereIn('user_id', $poolUserIds);
        }

        $salesList = $query
            ->orderByRaw('CASE WHEN last_update_lead IS NULL THEN 0 ELSE 1 END')
            ->orderBy('last_update_lead', 'asc')
            ->orderBy('urutan', 'asc')
            ->get();

        if ($salesList->isEmpty() && $poolUserIds !== null && count($poolUserIds) >= 2) {
            Log::warning('SalesRoundRobinService: Pool assign kosong, fallback RR semua sales');
            return $this->assignRoundRobinFromPool(null);
        }

        if ($salesList->isEmpty()) {
            Log::warning('SalesRoundRobinService: No sales found');
            return null;
        }

        $selectedSales = $salesList->first();
        $selectedSales->update([
            'last_update_lead' => now()->format('Y-m-d H:i:s'),
            'update_at' => now()->format('Y-m-d H:i:s'),
        ]);

        Log::info('SalesRoundRobinService: Selected sales', [
            'sales_id' => $selectedSales->user_id,
            'user_id' => $selectedSales->user_id,
            'assign_pool' => $poolUserIds,
        ]);

        return $selectedSales->user_id;
    }

    /**
     * @param mixed $assign
     * @return int[]
     */
    private function normalizeAssignUserIds($assign): array
    {
        if ($assign === null || $assign === '') {
            return [];
        }

        $arr = $assign;
        if (is_string($assign)) {
            $decoded = json_decode($assign, true);
            if (is_string($decoded)) {
                $decoded = json_decode($decoded, true);
            }
            $arr = is_array($decoded) ? $decoded : [];
        }

        if (!is_array($arr)) {
            return [];
        }

        $userIds = [];
        foreach ($arr as $id) {
            $intId = (int) $id;
            if ($intId > 0) {
                $userIds[] = $intId;
            }
        }

        return array_values(array_unique($userIds));
    }

    /**
     * Get sales WhatsApp number by user_id
     */
    public function getSalesWhatsApp(int $userId): ?string
    {
        try {
            $user = \App\Models\User::find($userId);

            if (!$user || empty($user->no_telp)) {
                Log::warning('SalesRoundRobinService: Sales WhatsApp not found', [
                    'user_id' => $userId,
                ]);
                return null;
            }

            $phone = preg_replace('/[^0-9]/', '', $user->no_telp);

            if (substr($phone, 0, 1) === '0') {
                $phone = '62' . substr($phone, 1);
            } elseif (substr($phone, 0, 2) !== '62') {
                $phone = '62' . $phone;
            }

            return $phone;
        } catch (\Exception $e) {
            Log::error('SalesRoundRobinService: Error getting WhatsApp', [
                'user_id' => $userId,
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
