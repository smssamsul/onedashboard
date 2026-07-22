<?php

namespace App\Traits;

use App\Models\Customer;
use App\Services\SalesRoundRobinService;
use Carbon\Carbon;

/**
 * Dipakai oleh endpoint publik (invitation, attendance check-in) yang perlu
 * mencari-atau-membuat Customer dari input nama/wa/email tanpa login.
 */
trait ResolvesPublicCustomer
{
    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', (string) $phone);

        if (substr($phone, 0, 4) === '6208') {
            $phone = '628' . substr($phone, 4);
        } elseif (substr($phone, 0, 2) === '08') {
            $phone = '628' . substr($phone, 2);
        } elseif (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }

    private function generateMemberID(Customer $customer): string
    {
        $createAt = $customer->create_at ?? now();
        if (is_string($createAt)) {
            $createAt = Carbon::parse($createAt);
        }
        $datePart = $createAt->format('Ymd');

        $attempts = 0;
        do {
            $sequence = str_pad((string) rand(1, 99999), 5, '0', STR_PAD_LEFT);
            $memberID = $datePart . $sequence;
            $exists = Customer::where('memberID', $memberID)
                ->where('id', '!=', $customer->id ?? null)
                ->exists();
            $attempts++;
            if ($attempts >= 100) {
                $memberID = $datePart . str_pad(substr((string) time(), -5), 5, '0', STR_PAD_LEFT);
                break;
            }
        } while ($exists);

        return $memberID;
    }

    /**
     * Cari customer existing berdasarkan wa/email, atau buat baru sebagai lead.
     * customer_type sengaja TIDAK di-set 'customer' di sini — hanya order yang
     * sudah dibayar yang boleh menaikkan status itu (lihat OrderValidationController).
     */
    private function findOrCreateCustomer(array $data, ?int $produkId): Customer
    {
        $wa = $this->formatPhoneNumber($data['wa']);

        $existing = Customer::where(function ($q) use ($data, $wa) {
                $q->where('wa', $wa);
                if (!empty($data['email'])) {
                    $q->orWhere('email', $data['email']);
                }
            })
            ->where('status', '!=', 'N')
            ->first();

        if ($existing) {
            $updateData = ['update_at' => now()];
            if (empty($existing->sales_id)) {
                $updateData['sales_id'] = app(SalesRoundRobinService::class)->getNextSalesId($produkId);
            }
            if (!empty($data['nama']) && $existing->nama != $data['nama']) {
                $updateData['nama'] = $data['nama'];
            }
            if ($existing->wa != $wa) {
                $updateData['wa'] = $wa;
            }
            if (!empty($data['email']) && $existing->email != $data['email']) {
                $updateData['email'] = $data['email'];
            }
            if (count($updateData) > 1) {
                $existing->update($updateData);
            }

            return $existing;
        }

        $customer = Customer::create([
            'nama' => $data['nama'],
            'email' => $data['email'] ?? null,
            'wa' => $wa,
            'sales_id' => app(SalesRoundRobinService::class)->getNextSalesId($produkId),
            'status' => '1',
            'customer_type' => 'lead',
            'keanggotaan' => 'basic',
            'create_at' => now(),
        ]);

        $customer->update(['memberID' => $this->generateMemberID($customer)]);

        return $customer;
    }
}
