<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\DokuServices;
use App\Models\OrderCustomer;
use App\Models\OrderPayment;
use App\Models\Sales;
use App\Models\TemplateFollup;
use App\Helpers\TemplateHelper;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DokuController extends Controller
{
    protected $doku;

    // Notification URL yang didaftarkan di DOKU Back Office (dipakai untuk verifikasi signature)
    const NOTIFICATION_REQUEST_TARGET = '/api/doku/notification';

    public function __construct(DokuServices $doku)
    {
        $this->doku = $doku;
    }

    /**
     * Ambil kode_order dari order_customer. Kalau belum ada, generate fallback
     * (seharusnya jarang terjadi karena kode_order sudah dibuat saat order dibuat).
     */
    private function resolveInvoiceNumber(Request $request): array
    {
        $order = null;

        if ($request->order_id) {
            $order = OrderCustomer::find($request->order_id);
        }

        if ($order && $order->kode_order) {
            return [$order->kode_order, $order];
        }

        // Fallback (order belum punya kode_order / order_id tidak dikirim)
        return ['ORDER-' . ($request->order_id ?? time()) . '-' . time(), $order];
    }

    private function buildPaymentBody(Request $request, string $invoiceNumber, array $paymentMethodTypes): array
    {
        return [
            'order' => [
                'amount'         => (int) $request->amount,
                'invoice_number' => $invoiceNumber,
                'currency'       => 'IDR',
            ],
            'payment' => [
                'payment_due_date'     => config('doku.payment_due_date'),
                'payment_method_types' => $paymentMethodTypes,
            ],
            'customer' => [
                'name'  => $request->name,
                'email' => $request->email,
            ],
        ];
    }

    private function createPaymentResponse(Request $request, array $paymentMethodTypes)
    {
        $request->validate([
            'amount'   => 'required|numeric|min:1000',
            'name'     => 'required|string',
            'email'    => 'required|email',
            'order_id' => 'nullable|integer',
        ]);

        [$invoiceNumber] = $this->resolveInvoiceNumber($request);

        $body = $this->buildPaymentBody($request, $invoiceNumber, $paymentMethodTypes);

        try {
            $result = $this->doku->createPayment($body);
        } catch (\Throwable $e) {
            Log::error('DOKU createPayment gagal', [
                'error' => $e->getMessage(),
                'invoice_number' => $invoiceNumber,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat pembayaran DOKU',
            ], 500);
        }

        return response()->json([
            'success'        => true,
            'payment_url'    => $result['response']['payment']['url'] ?? null,
            'token_id'       => $result['response']['payment']['token_id'] ?? null,
            'invoice_number' => $invoiceNumber,
        ]);
    }

    public function createPaymentCC(Request $request)
    {
        return $this->createPaymentResponse($request, ['CREDIT_CARD']);
    }

    public function createPaymentVA(Request $request)
    {
        return $this->createPaymentResponse($request, [
            'VIRTUAL_ACCOUNT_BCA',
            'VIRTUAL_ACCOUNT_BRI',
            'VIRTUAL_ACCOUNT_BNI',
            'VIRTUAL_ACCOUNT_BANK_PERMATA',
            'VIRTUAL_ACCOUNT_BANK_MANDIRI',
            'VIRTUAL_ACCOUNT_DOKU',
        ]);
    }

    public function createPaymentEwallet(Request $request)
    {
        return $this->createPaymentResponse($request, [
            'QRIS',
            'EMONEY_OVO',
            'EMONEY_DANA',
            'EMONEY_SHOPEEPAY',
        ]);
    }

    public function createPaymentGeneral(Request $request)
    {
        return $this->createPaymentResponse($request, [
            'CREDIT_CARD',
            'VIRTUAL_ACCOUNT_BCA',
            'VIRTUAL_ACCOUNT_BRI',
            'VIRTUAL_ACCOUNT_BNI',
            'VIRTUAL_ACCOUNT_BANK_PERMATA',
            'VIRTUAL_ACCOUNT_BANK_MANDIRI',
            'VIRTUAL_ACCOUNT_DOKU',
            'QRIS',
            'EMONEY_OVO',
            'EMONEY_DANA',
            'EMONEY_SHOPEEPAY',
        ]);
    }

    public function notificationHandler(Request $request)
    {
        $rawBody = $request->getContent();

        Log::info('DOKU Notification received', $request->all());

        $clientId  = $request->header('Client-Id');
        $requestId = $request->header('Request-Id');
        $timestamp = $request->header('Request-Timestamp');
        $signature = $request->header('Signature');

        $isValid = false;
        try {
            $isValid = $clientId && $requestId && $timestamp && $signature
                ? $this->doku->verifyNotificationSignature($clientId, $requestId, $timestamp, self::NOTIFICATION_REQUEST_TARGET, $rawBody, $signature)
                : false;
        } catch (\Throwable $e) {
            Log::error('DOKU notification - gagal verifikasi signature', ['error' => $e->getMessage()]);
        }

        if (!$isValid) {
            Log::warning('DOKU notification - signature tidak valid, notifikasi diabaikan', [
                'client_id' => $clientId,
                'request_id' => $requestId,
            ]);

            return response()->json(['success' => false, 'message' => 'Invalid signature'], 401);
        }

        $payload = $request->all();

        $invoiceNumber     = $payload['order']['invoice_number'] ?? null;
        $grossAmount       = $payload['order']['amount'] ?? null;
        $transactionStatus = $payload['transaction']['status'] ?? null; // SUCCESS | FAILED | PENDING
        $transactionDate   = $payload['transaction']['date'] ?? null;
        $paymentMethodType = $payload['channel'] ?? $payload['service'] ?? null;
        $vaNumber          = $payload['virtual_account_info']['virtual_account_number'] ?? null;
        $vaBank            = $payload['virtual_account_info']['virtual_account_bank'] ?? null;

        $order = $invoiceNumber
            ? OrderCustomer::with(['customer_rel', 'produk_rel', 'bundling_rel'])->where('kode_order', $invoiceNumber)->first()
            : null;

        if (!$order) {
            Log::warning('OrderCustomer tidak ditemukan untuk notifikasi DOKU', [
                'invoice_number' => $invoiceNumber,
            ]);

            return response()->json(['success' => true, 'message' => 'Order not found, acknowledged']);
        }

        $isSuccess = $transactionStatus === 'SUCCESS';

        if (!$isSuccess) {
            Log::info('DOKU notification bukan status SUCCESS, order tidak diupdate', [
                'order_customer_id'  => $order->id,
                'invoice_number'     => $invoiceNumber,
                'transaction_status' => $transactionStatus,
            ]);

            return response()->json(['success' => true, 'message' => 'Notification processed', 'data' => $payload]);
        }

        $order->update([
            'status_order'      => '2', // sudah dibayar
            'status_pembayaran' => '2', // pembayaran sukses
            'waktu_pembayaran'  => $order->waktu_pembayaran ?? now(),
            'update_at'         => now(),
        ]);

        // Auto-promote: lead -> customer saat pembayaran DOKU berhasil
        if ($order->customer_rel && $order->customer_rel->customer_type === 'lead') {
            $order->customer_rel->update(['customer_type' => 'customer']);

            \App\Models\Lead::where('customer_id', $order->customer_rel->id)
                ->where('status', '!=', 'N')
                ->whereNotIn('status', ['CONVERTED', 'LOST'])
                ->update(['status' => 'CONVERTED', 'update_at' => now()]);

            Log::info('DOKU notification - Lead dipromote ke customer', [
                'order_customer_id' => $order->id,
                'customer_id'       => $order->customer_rel->id,
            ]);
        }

        // Auto-dispatch Biteship shipping untuk produk fisik
        if (env('BITESHIP_AUTO_SHIPPING_ENABLED', true)) {
            try {
                $autoShipping = app(\App\Services\AutoBiteshipShippingService::class)->dispatchIfPhysical($order);
                Log::info('DOKU notification - Auto Biteship shipping', [
                    'order_customer_id'     => $order->id,
                    'auto_shipping_success' => $autoShipping['success'],
                    'auto_shipping_message' => $autoShipping['message'],
                    'resi_id'               => $autoShipping['resi']?->id,
                ]);
            } catch (\Throwable $e) {
                Log::error('DOKU notification - Auto Biteship shipping gagal', [
                    'order_customer_id' => $order->id,
                    'error'             => $e->getMessage(),
                ]);
            }
        }

        $paymentCount = OrderPayment::where('order_id', $order->id)->count();
        $paymentKe = $paymentCount + 1;

        $paymentMethod = $vaBank ? (strtoupper($vaBank) . ' VA') : $paymentMethodType;

        $tanggalPembayaran = null;
        if ($transactionDate) {
            try {
                $tanggalPembayaran = Carbon::parse($transactionDate)->format('Y-m-d');
            } catch (\Exception $e) {
                $tanggalPembayaran = null;
            }
        }
        if (!$tanggalPembayaran) {
            $tanggalPembayaran = now()->format('Y-m-d');
        }

        $payment = OrderPayment::create([
            'order_id'       => $order->id,
            'amount'         => $grossAmount ?? $order->total_harga,
            'payment_ke'     => $paymentKe,
            'payment_method' => $paymentMethod,
            'payment_type'   => $paymentMethodType,
            'tanggal'        => $tanggalPembayaran,
            'status'         => '2', // pembayaran sukses
            'catatan'        => 'Pembayaran otomatis dari DOKU - ' . $transactionStatus,
        ]);

        // Update keanggotaan customer untuk produk kategori workshop (6)
        if ($order->produk_rel && $order->customer_rel) {
            $produk = $order->produk_rel;

            if ($produk->kategori == 6 || $produk->kategori == '6') {
                if ($order->bundling_rel && $order->bundling_rel->nama) {
                    $namaBundling = $order->bundling_rel->nama;

                    $order->customer_rel->update([
                        'keanggotaan' => $namaBundling,
                    ]);

                    Log::info('DOKU notification - Update keanggotaan customer', [
                        'order_customer_id' => $order->id,
                        'customer_id'       => $order->customer_rel->id,
                        'kategori_produk'   => $produk->kategori,
                        'nama_bundling'     => $namaBundling,
                    ]);
                } else {
                    Log::warning('DOKU notification - Bundling tidak ditemukan untuk order workshop', [
                        'order_customer_id' => $order->id,
                        'produk_id'         => $produk->id,
                        'kategori_produk'   => $produk->kategori,
                        'order_bundling_id' => $order->bundling,
                    ]);
                }
            }
        }

        // Kirim notifikasi WhatsApp ke customer
        try {
            if ($order->customer_rel && $order->customer_rel->wa) {
                $customer = $order->customer_rel;
                $produk = $order->produk_rel;

                $templateFollup = TemplateFollup::where('produk_id', $order->produk)
                    ->where('type', '7')
                    ->first();

                // Jika template ada tapi "Enable Auto Send" dimatikan (status = 2), jangan kirim WA
                $autoSendEnabled = !$templateFollup || $templateFollup->status !== '2';

                if ($templateFollup) {
                    $dataText = [
                        'customer_name'  => $customer->nama ?? '',
                        'product_name'   => $produk->nama ?? '',
                        'order_date'     => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : now()->format('d-m-Y'),
                        'order_total'    => number_format($order->total_harga ?? 0, 0, ',', '.'),
                        'payment_amount' => number_format($payment->amount ?? 0, 0, ',', '.'),
                        'payment_method' => $payment->payment_method ?? '',
                        'payment_ke'     => $payment->payment_ke ?? 1,
                    ];

                    $message = TemplateHelper::render($templateFollup->text, $dataText);
                } else {
                    $message = "Halo {$customer->nama},\n\nTerima kasih! Pembayaran Anda sebesar Rp " . number_format($payment->amount, 0, ',', '.') . " untuk produk {$produk->nama} telah berhasil diverifikasi dan disetujui.\n\nTerima kasih atas kepercayaan Anda 🙏";
                }

                $woowaKey = $this->getWoowaKeyFromSales($customer);

                if (!$autoSendEnabled) {
                    Log::info('DOKU notification - Auto send Complete dimatikan, WA tidak dikirim', [
                        'order_customer_id' => $order->id,
                        'payment_id'        => $payment->id,
                    ]);
                } elseif ($woowaKey) {
                    $waSender = app(\App\Services\WhatsAppSenderService::class);
                    $response = $waSender->sendMessage($customer->wa, $message, null, $woowaKey);

                    Log::info('DOKU notification - Response WhatsApp', [
                        'order_customer_id' => $order->id,
                        'payment_id'        => $payment->id,
                        'http_status'       => $response->status(),
                        'successful'        => $response->successful(),
                    ]);
                } else {
                    Log::warning('DOKU notification - Woowa Key tidak ditemukan', [
                        'order_customer_id' => $order->id,
                        'payment_id'        => $payment->id,
                        'customer_id'       => $customer->id,
                    ]);
                }
            } else {
                Log::warning('DOKU notification - Customer tidak memiliki nomor WA', [
                    'order_customer_id' => $order->id,
                    'payment_id'        => $payment->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('DOKU notification - Exception saat kirim WhatsApp', [
                'order_customer_id' => $order->id,
                'payment_id'        => $payment->id ?? null,
                'error_message'     => $e->getMessage(),
            ]);
        }

        Log::info('OrderCustomer payment success updated from DOKU', [
            'order_customer_id'  => $order->id,
            'invoice_number'     => $invoiceNumber,
            'transaction_status' => $transactionStatus,
            'payment_created'    => true,
            'order_value'        => $grossAmount ?? $order->total_harga ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Notification processed',
            'data'    => $payload,
        ]);
    }

    /**
     * Ambil woowa_key dari sales berdasarkan customer.
     */
    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return \App\Models\SalesSetting::getWoowaUtama();
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();

        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        return \App\Models\SalesSetting::getWoowaUtama();
    }
}
