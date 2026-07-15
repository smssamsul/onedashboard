<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use App\Models\OrderCustomer;
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
}
