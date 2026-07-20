<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\OrderCustomer;
use App\Models\TemplateFollup;
use App\Models\LogsFollup;
use App\Models\Sales;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;

class CancelUnpaidOrdersCron extends Command
{
    /**
     * Command artisan signature.
     */
    protected $signature = 'orders:cancel-unpaid {--debug : Running command in debug mode without updating database}';

    /**
     * Description of the command.
     */
    protected $description = 'Cancel unpaid orders that are older than 14 days';

    public function handle()
    {
        $startTime = now();
        $this->info("=== Start auto cancel unpaid orders ===");
        Log::info("=== Start auto cancel unpaid orders ===", [
            'timestamp' => $startTime->toDateTimeString(),
        ]);

        $debug = $this->option('debug');

        if ($debug) {
            $this->warn('⚠ Running in DEBUG mode - database will not be updated');
        }

        // Get orders created at least 14 days ago, unpaid (status_pembayaran 0 or null), and not already canceled/rejected (status_order != 3)
        // Also exclude soft-deleted or N-status orders (status != N)
        $unpaidLimitDate = Carbon::now()->subDays(14);

        $orders = OrderCustomer::where('status', '!=', 'N')
            ->where(function($q) {
                $q->where('status_pembayaran', '0')
                  ->orWhereNull('status_pembayaran');
            })
            ->where('status_order', '!=', '3')
            ->where('create_at', '<=', $unpaidLimitDate)
            ->with(['customer_rel', 'produk_rel'])
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            $this->info("Canceling unpaid order ID: {$order->id}, Code: {$order->kode_order}, Created: {$order->create_at}");
            Log::info("Canceling unpaid order", [
                'id' => $order->id,
                'kode_order' => $order->kode_order,
                'created_at' => $order->create_at,
            ]);

            if (!$debug) {
                // Update status_order to '3' (canceled/rejected)
                $order->update([
                    'status_order' => '3',
                    'update_at' => now(),
                ]);

                $this->sendCancelNotification($order);
            }
            $count++;
        }

        $endTime = now();
        $duration = $endTime->diffInSeconds($startTime);
        $this->info("=== Finished canceling unpaid orders. Total canceled: {$count}. Duration: {$duration} seconds ===");
        Log::info("=== Finished canceling unpaid orders ===", [
            'timestamp' => $endTime->toDateTimeString(),
            'total_canceled' => $count,
            'duration_seconds' => $duration,
        ]);

        return Command::SUCCESS;
    }

    /**
     * Kirim template WA "Cancel" (type 10) ke customer saat order otomatis di-cancel karena unpaid 14 hari.
     */
    private function sendCancelNotification(OrderCustomer $order): void
    {
        $customer = $order->customer_rel;
        if (!$customer || !$customer->wa) {
            return;
        }

        $template = TemplateFollup::active()
            ->where('produk_id', $order->produk)
            ->where('type', '10')
            ->first();

        if (!$template) {
            // Belum ada template Cancel untuk produk ini
            return;
        }

        $sudahKirim = LogsFollup::where('follup', $template->id)
            ->where('customer', $customer->id)
            ->where('order', $order->id)
            ->where('type', $template->type)
            ->exists();

        if ($sudahKirim) {
            return;
        }

        $data = [
            'customer_name' => $customer->nama ?? '',
            'product_name'  => $order->produk_rel->nama ?? '',
            'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
            'order_total'   => number_format((float) $order->total_harga, 0, ',', '.'),
        ];

        $message = TemplateHelper::render($template->text, $data);
        $woowaKey = $this->getWoowaKeyFromSales($customer);

        try {
            $waSender = app(\App\Services\WhatsAppSenderService::class);
            $response = $waSender->sendMessage($customer->wa, $message, $customer->sales_id ?? null, $woowaKey);

            $statusText = $response->successful() ? 'sukses' : 'gagal';
            $keterangan = "Kirim WA cancel order ke {$customer->wa} ({$customer->nama}). Status: {$statusText}. Pesan: {$message}";

            LogsFollup::create([
                'follup'     => $template->id,
                'customer'   => $customer->id,
                'order'      => $order->id,
                'type'       => $template->type,
                'keterangan' => $keterangan,
                'create_at'  => now(),
                'status'     => $response->successful() ? '1' : '0',
            ]);

            if ($response->successful()) {
                $this->info("Pesan cancel terkirim ke {$customer->nama}");
            } else {
                $this->warn("Gagal kirim pesan cancel ({$response->status()})");
            }
        } catch (\Exception $e) {
            Log::error("Gagal kirim WA cancel order", [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function getWoowaKeyFromSales($customer)
    {
        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();

        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        return env('WOOWA_KEY');
    }
}
