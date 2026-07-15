<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Reklasifikasi data customer yang sudah ada:
     * - Siapapun yang punya minimal 1 order PAID → customer_type = 'customer'
     * - Sisanya tetap 'lead' (sudah jadi default dari migration sebelumnya)
     *
     * Sumber data yang diperiksa:
     * 1. order_customer (aktif) → status_pembayaran = '2' AND status != 'N'
     * 2. order_customer_arsip (arsip lama) → status_pembayaran = '2'
     */
    public function up(): void
    {
        // --- Hitung sebelum reklasifikasi (untuk logging) ---
        $totalCustomer = DB::table('customer')->where('status', '!=', 'N')->count();

        // Customer yang punya paid order di order_customer (aktif)
        $paidFromActive = DB::table('order_customer')
            ->where('status_pembayaran', '2')
            ->where('status', '!=', 'N')
            ->distinct()
            ->pluck('customer')
            ->toArray();

        // Customer yang punya paid order di order_customer_arsip (arsip lama)
        $paidFromArsip = DB::table('order_customer_arsip')
            ->where('status_pembayaran', '2')
            ->distinct()
            ->pluck('customer_id')
            ->toArray();

        // Gabungkan & deduplikasi
        $paidCustomerIds = array_values(array_unique(array_merge($paidFromActive, $paidFromArsip)));

        Log::info('Reklasifikasi customer_type - sebelum', [
            'total_customer'         => $totalCustomer,
            'paid_from_active_order' => count($paidFromActive),
            'paid_from_arsip'        => count($paidFromArsip),
            'total_unique_paid'      => count($paidCustomerIds),
        ]);

        // --- Update customer_type ke 'customer' untuk yang sudah pernah bayar ---
        if (!empty($paidCustomerIds)) {
            // Proses per batch agar tidak overload query untuk dataset besar
            $chunks = array_chunk($paidCustomerIds, 500);
            $totalUpdated = 0;

            foreach ($chunks as $chunk) {
                $updated = DB::table('customer')
                    ->whereIn('id', $chunk)
                    ->update(['customer_type' => 'customer']);
                $totalUpdated += $updated;
            }

            Log::info('Reklasifikasi customer_type - selesai', [
                'total_updated_to_customer' => $totalUpdated,
                'remaining_leads'           => $totalCustomer - $totalUpdated,
            ]);
        } else {
            Log::info('Reklasifikasi customer_type - tidak ada customer yang perlu diupdate (semua tetap lead)');
        }
    }

    public function down(): void
    {
        // Rollback: kembalikan semua ke 'lead' (default dari migration sebelumnya)
        // Ini aman karena kolom customer_type di-drop oleh rollback migration 1
        // Tidak perlu action di sini karena bergantung pada migration 1
        DB::table('customer')->update(['customer_type' => 'lead']);
    }
};
