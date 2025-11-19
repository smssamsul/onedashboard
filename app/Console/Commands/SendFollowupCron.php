<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Models\Produk;
use App\Models\OrderCustomer;
use App\Models\TemplateFollup;
use App\Models\LogsFollup;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;

class SendFollowupCron extends Command
{
    /**
     * Command artisan
     */
    protected $signature = 'followup:send {--debug : Mode debug tanpa kirim pesan WA}';

    protected $description = 'Kirim pesan follow-up otomatis ke customer yang belum bayar berdasarkan event template.';

    public function handle()
    {
        $this->info("=== Mulai proses follow-up otomatis ===");
        $debug = $this->option('debug');

        if ($debug) {
            $this->warn('⚠ Mode DEBUG aktif — pesan tidak akan dikirim ke WhatsApp');
        }

        $deviceKey = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');
        $token     = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');

        $produkList = Produk::where('status', '1')->get();

        foreach ($produkList as $produk) {
            $this->info("Produk aktif: {$produk->nama}");

            $templates = TemplateFollup::where('produk_id', $produk->id)
                ->whereIn('type', [1, 2, 3, 4])
                ->where('status', '!=', 'N')
                ->get();

            foreach ($templates as $template) {
                $this->info("Template: {$template->nama} ({$template->event})");

                $orders = OrderCustomer::with(['customer_rel'])
                    ->where('produk', $produk->id)
                    ->whereNull('waktu_pembayaran')
                    ->where('status', 1)
                    ->get();

                foreach ($orders as $order) {
                    if (!$order->customer) continue;

                    try {
                        [$hariPart, $jamPart] = explode('-', $template->event);
                        $jumlahHari = (int) str_replace('d', '', strtolower($hariPart));
                        $jamKirim   = $jamPart ?? '09:00';
                    } catch (\Throwable $e) {
                        $this->warn("⚠ Format event tidak valid: {$template->event}");
                        continue;
                    }

                    $targetTime = Carbon::parse($order->tanggal)
                        ->addDays($jumlahHari)
                        ->setTimeFromTimeString($jamKirim);

                    if (Carbon::now()->lt($targetTime)) {
                        continue;
                    }

                    $sudahKirim = LogsFollup::where('follup', $template->id)
                        ->where('customer', $order->customer_rel->id)
                        ->exists();

                    if ($sudahKirim) continue;

                    $customData = json_decode($order->custom_value, true) ?? [];

                    $data = array_merge([
                        'customer_name' => $order->customer_rel->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
                        'order_total'   => number_format($order->total_harga, 0, ',', '.'),
                    ], $customData);

                    $message = TemplateHelper::render($template->text, $data);

                    if ($debug) {
                        $this->line("[DEBUG] Kirim ke {$order->customer_rel->wa}: {$message}");
                        continue;
                    }

                    try {
                        $response = Http::withToken($token)
                            ->asJson()
                            ->withHeaders([
                                'Content-Type' => 'application/json',
                                'Accept' => 'application/json'
                            ])
                            ->post('https://api.quods.id/api/message', [
                                'device_key' => $deviceKey,
                                'data' => [
                                    [
                                        'phone'   => $order->customer_rel->wa,
                                        'message' => $message,
                                    ]
                                ]
                            ]);

                        LogsFollup::create([
                            'follup'     => $template->id,
                            'customer'   => $order->customer_rel->id,
                            'keterangan' => $response->successful() ? 'Terkirim' : 'Gagal kirim',
                            'create_at'  => now(),
                            'status'     => $response->successful() ? 'Y' : 'N',
                        ]);

                        if ($response->successful()) {
                            $this->info("Pesan terkirim ke {$order->customer_rel->nama}");
                        } else {
                            $this->warn("Gagal kirim ({$response->status()})");
                        }

                    } catch (\Exception $e) {
                        LogsFollup::create([
                            'follup'     => $template->id,
                            'customer'   => $order->customer_rel->id,
                            'keterangan' => 'Error: ' . $e->getMessage(),
                            'create_at'  => now(),
                            'status'     => 'N',
                        ]);

                        $this->error("⚠ Error kirim pesan: " . $e->getMessage());
                    }
                }
            }
        }

        $this->info("=== Proses follow-up selesai ===");
        return Command::SUCCESS;
    }
}