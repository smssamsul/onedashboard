<?php

namespace App\Console\Commands;

use App\Helpers\TemplateHelper;
use App\Models\LogsFollup;
use App\Models\OrderCustomer;
use App\Models\Sales;
use App\Models\TemplateFollup;
use App\Services\BaileysService;
use App\Services\WhatsAppSenderService;
use Carbon\Carbon;
use Illuminate\Console\Command;

/**
 * Kirim ulang pesan "Register" (bubble W di menu Order) untuk order 3 bulan
 * terakhir yang belum pernah sukses terkirim - dibuat setelah ditemukan
 * backlog besar akibat sesi Baileys sales_21/sales_24 sempat terputus.
 * Bikin sebagai Artisan command (bukan script sekali pakai) karena skenario
 * "sesi Baileys terputus lalu ada backlog" ini sudah beberapa kali terjadi
 * dan kemungkinan besar akan terjadi lagi.
 */
class ResendRegisterBacklog extends Command
{
    protected $signature = 'followup:resend-register-backlog
        {--sales-id= : Hanya proses order dengan sales_id ini (mis. 24)}
        {--dry-run : Cuma tampilkan daftar order, tidak benar-benar kirim}
        {--limit= : Batasi jumlah order yang diproses}
        {--min-gap=84 : Jeda minimum antar pesan (detik)}
        {--max-gap=112 : Jeda maksimum antar pesan (detik)}';

    protected $description = 'Kirim ulang pesan Register (W) untuk order 3 bulan terakhir yang belum pernah sukses terkirim';

    public function handle(): int
    {
        $salesId = $this->option('sales-id');
        $limit = $this->option('limit') ? (int) $this->option('limit') : null;
        $dryRun = (bool) $this->option('dry-run');
        $minGap = (int) $this->option('min-gap');
        $maxGap = (int) $this->option('max-gap');

        $query = OrderCustomer::query()
            ->with(['customer_rel', 'produk_rel'])
            ->where('create_at', '>=', now()->subMonths(3)->toDateTimeString())
            ->where('status', '!=', 'N')
            ->whereIn('status_order', ['1', '2', '4'])
            ->whereNotIn('id', function ($q) {
                $q->select('order')->from('logs_follup')
                    ->where('type', 'order dibuat')
                    ->where('status', '1');
            })
            ->orderBy('id');

        if ($salesId) {
            $query->where(function ($q) use ($salesId) {
                $q->where('sales_id', $salesId)
                    ->orWhereHas('customer_rel', fn ($cq) => $cq->where('sales_id', $salesId));
            });
        }

        $orders = $query->get();
        if ($limit) {
            $orders = $orders->take($limit);
        }

        $total = $orders->count();
        $this->info("Ditemukan {$total} order untuk diproses.");

        if ($total === 0) {
            return self::SUCCESS;
        }

        // Pre-flight: pastikan sesi Baileys sales-nya benar-benar tersambung
        // dulu sebelum mulai - kalau tidak, semua akan gagal lagi percuma.
        if (!$dryRun && $salesId) {
            $sales = Sales::where('user_id', $salesId)->orWhere('id', $salesId)->first();
            $sessionId = $sales?->baileys_session_id ?: "sales_{$salesId}";
            $status = app(BaileysService::class)->getStatus($sessionId);
            if (!in_array($status['status'] ?? null, ['open', 'connected'])) {
                $this->error("Sesi Baileys '{$sessionId}' status: " . ($status['status'] ?? 'unknown') . " - dihentikan, tidak jadi kirim.");
                return self::FAILURE;
            }
            $this->info("Sesi Baileys '{$sessionId}' terkonfirmasi connected. Lanjut kirim.");
        }

        $waSender = app(WhatsAppSenderService::class);
        $sukses = 0;
        $gagal = 0;

        foreach ($orders as $i => $order) {
            $customer = $order->customer_rel;
            $produk = $order->produk_rel;

            if (!$customer || !$customer->wa || !$produk) {
                $this->warn("Order #{$order->id} dilewati: data customer/produk tidak lengkap.");
                continue;
            }

            $template = TemplateFollup::where('produk_id', $produk->id)
                ->where('type', '5')
                ->where('status', '!=', 'N')
                ->first();

            if (!$template) {
                $this->warn("Order #{$order->id} dilewati: template Register untuk produk #{$produk->id} tidak ditemukan.");
                continue;
            }

            $customData = [];
            if ($order->custom_value) {
                $decoded = json_decode($order->custom_value, true);
                $customData = is_array($decoded) ? $decoded : [];
            }

            $data = array_merge([
                'customer_name' => $customer->nama ?? '',
                'product_name' => $produk->nama ?? '',
                'order_date' => $order->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : '',
                'order_total' => $order->total_harga ? number_format((float) $order->total_harga, 0, ',', '.') : '0',
            ], $customData);

            $message = TemplateHelper::render($template->text, $data);
            $resolvedSalesId = $order->sales_id ?? $customer->sales_id;

            $progress = ($i + 1) . "/{$total}";

            if ($dryRun) {
                $this->line("[DRY RUN] {$progress} Order #{$order->id} ({$order->kode_order}) -> {$customer->wa} ({$customer->nama}), produk: {$produk->nama}");
                continue;
            }

            try {
                $response = $waSender->sendMessage($customer->wa, $message, $resolvedSalesId, null);
                $isSuccess = $response->successful();
                $responseText = json_encode($response->json() ?? $response->body());
            } catch (\Throwable $e) {
                $isSuccess = false;
                $responseText = 'Error: ' . $e->getMessage();
            }

            LogsFollup::create([
                'follup' => $template->id,
                'customer' => $customer->id,
                'order' => $order->id,
                'type' => 'order dibuat',
                'keterangan' => "Kirim ulang (resend backlog 3 bulan) WA Register ke {$customer->wa} ({$customer->nama}). Status: "
                    . ($isSuccess ? 'sukses' : 'gagal') . ". Pesan: {$message}\nResponse: {$responseText}",
                'create_at' => now(),
                'status' => $isSuccess ? '1' : '0',
            ]);

            if ($isSuccess) {
                $sukses++;
                $this->info("{$progress} Order #{$order->id}: SUKSES");
            } else {
                $gagal++;
                $this->error("{$progress} Order #{$order->id}: GAGAL ({$responseText})");
            }

            if ($i < $total - 1) {
                $gap = rand($minGap, $maxGap);
                $this->line("  jeda {$gap} detik...");
                sleep($gap);
            }
        }

        $this->info("Selesai. Sukses: {$sukses}, Gagal: {$gagal}.");

        return self::SUCCESS;
    }
}
