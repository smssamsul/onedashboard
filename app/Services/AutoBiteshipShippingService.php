<?php

namespace App\Services;

use App\Models\OrderCustomer;
use App\Models\OrderResi;
use App\Services\BiteshipService;
use Illuminate\Support\Facades\Log;

/**
 * AutoBiteshipShippingService
 *
 * Secara otomatis membuat order pengiriman Biteship ketika sebuah order
 * produk fisik (jenis_produk = 'fisik') telah lunas terbayar.
 *
 * Service ini dirancang aman (tidak melempar exception) agar tidak
 * memutus alur konfirmasi pembayaran yang sedang berjalan.
 */
class AutoBiteshipShippingService
{
    /**
     * Dispatch order Biteship jika produk fisik dan belum ada resi.
     * Gagal secara senyap (log saja) agar tidak mengganggu alur payment.
     *
     * @param  OrderCustomer  $order  Order yang baru saja lunas.
     * @return array{success: bool, message: string, resi: ?OrderResi}
     */
    public function dispatchIfPhysical(OrderCustomer $order): array
    {
        try {
            // 1. Pastikan produk sudah di-load
            $order->loadMissing(['produk_rel', 'customer_rel']);
            $produk  = $order->produk_rel;
            $customer = $order->customer_rel;

            // 2. Cek apakah produk fisik
            if (! $produk || strtolower((string) $produk->jenis_produk) !== 'fisik') {
                Log::info('AutoBiteshipShipping: produk bukan fisik, skip', [
                    'order_id'       => $order->id,
                    'produk_id'      => $produk?->id,
                    'jenis_produk'   => $produk?->jenis_produk,
                ]);
                return ['success' => false, 'message' => 'Produk bukan fisik', 'resi' => null];
            }

            // 3. Cek apakah sudah ada resi (idempotent)
            $existingResi = OrderResi::where('order_id', $order->id)->first();
            if ($existingResi) {
                Log::info('AutoBiteshipShipping: resi sudah ada, skip', [
                    'order_id' => $order->id,
                    'resi_id'  => $existingResi->id,
                ]);
                return ['success' => false, 'message' => 'Resi sudah ada', 'resi' => $existingResi];
            }

            // 4. Ambil kode pos dari customer (disimpan langsung di kolom kode_pos)
            //    Fallback: coba ekstrak dari string alamat order jika customer->kode_pos kosong
            $destPostal = null;
            if ($customer && ! empty($customer->kode_pos)) {
                $destPostal = (int) preg_replace('/\D/', '', (string) $customer->kode_pos);
                if ($destPostal < 10000) $destPostal = null; // pastikan 5 digit valid
            }
            if (! $destPostal) {
                $destPostal = $this->extractPostalFromAlamat($order->alamat);
            }
            if (! $destPostal) {
                Log::warning('AutoBiteshipShipping: kode pos tidak ditemukan di customer maupun alamat, skip', [
                    'order_id'       => $order->id,
                    'customer_id'    => $customer?->id,
                    'customer_kodepos' => $customer?->kode_pos,
                    'alamat'         => $order->alamat,
                ]);
                return ['success' => false, 'message' => 'Kode pos tidak ditemukan', 'resi' => null];
            }

            // 5. Siapkan data penerima
            $phone = $customer ? preg_replace('/\D+/', '', (string) $customer->wa) : '';
            if (strlen($phone) < 10) {
                $phone = env('BITESHIP_SHIPPER_CONTACT_PHONE', '081234567890');
            }
            $destContactName  = $customer?->nama ?? 'Penerima';
            $destContactPhone = $phone;
            // Alamat: gunakan field alamat di order (teks gabungan dari landing page),
            // jika kosong fallback ke alamat customer
            $destAddress = $order->alamat ?: $customer?->alamat ?: '-';

            // 6. Nilai barang
            $itemValue = max(1000, (int) round((float) ($order->harga ?? $order->total_harga ?? 0)));

            // 7. Kurir default (hanya JNE REG)
            $courierCompany = strtolower(env('BITESHIP_DEFAULT_COURIER_COMPANY', 'jne'));
            $courierType    = strtolower(env('BITESHIP_DEFAULT_COURIER_TYPE',    'reg'));

            // 8. Reference ID unik
            $reference = 'auto-od-' . $order->id . '-' . bin2hex(random_bytes(4));

            // 9. Payload Biteship
            $payload = array_merge($this->biteshipOriginDefaults(), [
                'destination_contact_name'  => $destContactName,
                'destination_contact_phone' => $destContactPhone,
                'destination_address'       => $destAddress,
                'destination_postal_code'   => (int) $destPostal,
                'courier_company'           => $courierCompany,
                'courier_type'              => $courierType,
                'delivery_type'             => 'now',
                'reference_id'              => $reference,
                'items'                     => [
                    [
                        'name'     => $produk->nama ?? 'Paket',
                        'value'    => $itemValue,
                        'quantity' => 1,
                        'weight'   => 1000, // 1kg default
                        'category' => 'others',
                    ],
                ],
            ]);

            // 10. Panggil Biteship
            $data = BiteshipService::createOrder($payload);

            // 11. Simpan ke order_resi
            $courier = is_array($data['courier'] ?? null) ? $data['courier'] : [];
            $resi = OrderResi::create([
                'order_id'          => $order->id,
                'biteship_order_id' => $data['id'] ?? null,
                'tracking_id'       => $courier['tracking_id'] ?? null,
                'waybill_id'        => $courier['waybill_id'] ?? null,
                'courier_company'   => $courierCompany,
                'courier_type'      => $courierType,
                'delivery_type'     => 'now',
                'scheduled_at'      => null,
                'status'            => $data['status'] ?? null,
                'meta'              => ['create_response' => $data, 'auto_dispatch' => true],
            ]);

            Log::info('AutoBiteshipShipping: order Biteship berhasil dibuat otomatis', [
                'order_id'          => $order->id,
                'resi_id'           => $resi->id,
                'biteship_order_id' => $resi->biteship_order_id,
                'courier'           => $courierCompany . '/' . $courierType,
            ]);

            return ['success' => true, 'message' => 'Order Biteship berhasil dibuat otomatis', 'resi' => $resi];

        } catch (\Throwable $e) {
            Log::error('AutoBiteshipShipping: gagal dispatch', [
                'order_id' => $order->id ?? null,
                'error'    => $e->getMessage(),
                'file'     => $e->getFile(),
                'line'     => $e->getLine(),
            ]);
            return ['success' => false, 'message' => $e->getMessage(), 'resi' => null];
        }
    }

    /**
     * Ekstrak kode pos 5 digit dari string alamat.
     */
    private function extractPostalFromAlamat(?string $alamat): ?int
    {
        if (! $alamat) {
            return null;
        }
        if (preg_match('/(\d{5})\b/', $alamat, $m)) {
            return (int) $m[1];
        }
        return null;
    }

    /**
     * Default origin payload dari .env (sama konsep dengan OrderResiController).
     *
     * @return array<string, mixed>
     */
    private function biteshipOriginDefaults(): array
    {
        $postal = (int) env('BITESHIP_ORIGIN_POSTAL_CODE', 12440);

        return [
            'shipper_contact_name'  => env('BITESHIP_SHIPPER_CONTACT_NAME',  env('BITESHIP_ORIGIN_CONTACT_NAME', 'Shipper')),
            'shipper_contact_phone' => env('BITESHIP_SHIPPER_CONTACT_PHONE', env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890')),
            'shipper_organization'  => env('BITESHIP_SHIPPER_ORGANIZATION', ''),
            'origin_contact_name'   => env('BITESHIP_ORIGIN_CONTACT_NAME',  'Warehouse'),
            'origin_contact_phone'  => env('BITESHIP_ORIGIN_CONTACT_PHONE', '081234567890'),
            'origin_address'        => env('BITESHIP_ORIGIN_ADDRESS',        'Jakarta'),
            'origin_postal_code'    => $postal,
        ];
    }
}
