<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
        $startTime = now();
        $this->info("=== Mulai proses follow-up otomatis ===");
        Log::channel('followup')->info("=== Mulai proses follow-up otomatis ===", [
            'timestamp' => $startTime->toDateTimeString(),
        ]);
        
        $debug = $this->option('debug');

        if ($debug) {
            $this->warn('⚠ Mode DEBUG aktif — pesan tidak akan dikirim ke WhatsApp');
            Log::channel('followup')->warning('Mode DEBUG aktif — pesan tidak akan dikirim ke WhatsApp');
        }

        // Kode Quods (LAMA - DIKOMENTAR)
        // $deviceKey = env('QUODS_DEVICE_KEY', 'rCAIkWZDFOCosr3');
        // $token     = env('QUODS_API_TOKEN', 'kLHLPGydnu219dsc67NFbZbaPwN5ow');

        $woowaKey = env('WOOWA_KEY');

        $produkList = Produk::where('status', '1')->get();

        foreach ($produkList as $produk) {
            $this->info("Produk aktif: {$produk->nama}");
            Log::channel('followup')->info("Memproses produk", [
                'produk_id' => $produk->id,
                'produk_nama' => $produk->nama,
            ]);

            $templates = TemplateFollup::where('produk_id', $produk->id)
                ->whereIn('type', [1, 2, 3, 4, 11])
                ->where('status', '!=', 'N')
                ->get();

            foreach ($templates as $template) {
                $this->info("Template: {$template->nama} ({$template->event})");
                Log::channel('followup')->info("Memproses template", [
                    'template_id' => $template->id,
                    'template_nama' => $template->nama,
                    'template_event' => $template->event,
                    'template_type' => $template->type,
                ]);

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
                        Log::channel('followup')->warning("Format event tidak valid", [
                            'template_id' => $template->id,
                            'template_nama' => $template->nama,
                            'event' => $template->event,
                            'error' => $e->getMessage(),
                        ]);
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
                        Log::channel('followup')->debug("DEBUG: Pesan akan dikirim", [
                            'customer_id' => $order->customer_rel->id,
                            'customer_nama' => $order->customer_rel->nama,
                            'customer_wa' => $order->customer_rel->wa,
                            'template_id' => $template->id,
                            'pesan' => $message,
                        ]);
                        continue;
                    }

                    try {
                        // Kode Quods (LAMA - DIKOMENTAR)
                        // $response = Http::withToken($token)
                        //     ->asJson()
                        //     ->withHeaders([
                        //         'Content-Type' => 'application/json',
                        //         'Accept' => 'application/json'
                        //     ])
                        //     ->post('https://api.quods.id/api/message', [
                        //         'device_key' => $deviceKey,
                        //         'data' => [
                        //             [
                        //                 'phone'   => $order->customer_rel->wa,
                        //                 'message' => $message,
                        //             ]
                        //         ]
                        //     ]);

                        $response = Http::asJson()
                            ->withHeaders([
                                'Content-Type' => 'application/json',
                                'Accept' => 'application/json'
                            ])
                            ->post('https://notifapi.com/send_message', [
                                'phone_no' => $order->customer_rel->wa,
                                'key'      => $woowaKey,
                                'message'  => $message,
                            ]);

                        $templateType = $template->type ?? '-';
                        $statusText = $response->successful() ? 'sukses' : 'gagal';
                        $keterangan = "Kirim WA follow up type {$templateType} ke {$order->customer_rel->wa} ({$order->customer_rel->nama}). Status: {$statusText}. Pesan: {$message}";
                        
                        if ($response !== null) {
                            $responseData = $response->json();
                            $responseText = is_array($responseData) ? json_encode($responseData) : (string) $response->body();
                            $keterangan .= "\nResponse: {$responseText}";
                        }

                        LogsFollup::create([
                            'follup'     => $template->id,
                            'customer'   => $order->customer_rel->id,
                            'keterangan' => $keterangan,
                            'create_at'  => now(),
                            'status'     => $response->successful() ? '1' : '0',
                        ]);

                        if ($response->successful()) {
                            $this->info("Pesan terkirim ke {$order->customer_rel->nama}");
                            Log::channel('followup')->info("Pesan berhasil dikirim", [
                                'customer_id' => $order->customer_rel->id,
                                'customer_nama' => $order->customer_rel->nama,
                                'customer_wa' => $order->customer_rel->wa,
                                'template_id' => $template->id,
                                'template_type' => $templateType,
                                'response_status' => $response->status(),
                            ]);
                        } else {
                            $this->warn("Gagal kirim ({$response->status()})");
                            Log::channel('followup')->error("Pesan gagal dikirim", [
                                'customer_id' => $order->customer_rel->id,
                                'customer_nama' => $order->customer_rel->nama,
                                'customer_wa' => $order->customer_rel->wa,
                                'template_id' => $template->id,
                                'template_type' => $templateType,
                                'response_status' => $response->status(),
                                'response_body' => $response->body(),
                            ]);
                        }

                    } catch (\Exception $e) {
                        $templateType = $template->type ?? '-';
                        $keterangan = "Kirim WA follow up type {$templateType} ke {$order->customer_rel->wa} ({$order->customer_rel->nama}). Status: gagal. Pesan: {$message}";
                        $keterangan .= "\nResponse: Error: " . $e->getMessage();

                        LogsFollup::create([
                            'follup'     => $template->id,
                            'customer'   => $order->customer_rel->id,
                            'keterangan' => $keterangan,
                            'create_at'  => now(),
                            'status'     => '0',
                        ]);

                        $this->error("⚠ Error kirim pesan: " . $e->getMessage());
                        Log::channel('followup')->error("Exception saat kirim pesan", [
                            'customer_id' => $order->customer_rel->id,
                            'customer_nama' => $order->customer_rel->nama,
                            'customer_wa' => $order->customer_rel->wa,
                            'template_id' => $template->id,
                            'template_type' => $templateType,
                            'error_message' => $e->getMessage(),
                            'error_trace' => $e->getTraceAsString(),
                        ]);
                    }
                }
            }
        }

        $endTime = now();
        $duration = $endTime->diffInSeconds($startTime);
        $this->info("=== Proses follow-up selesai ===");
        Log::channel('followup')->info("=== Proses follow-up selesai ===", [
            'timestamp' => $endTime->toDateTimeString(),
            'duration_seconds' => $duration,
        ]);
        return Command::SUCCESS;
    }
}