<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Produk;
use App\Models\OrderCustomer;
use App\Models\TemplateFollup;
use App\Models\LogsFollup;
use App\Models\Customer;
use App\Models\Sales;
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

        $produkList = Produk::where('status', '1')->get();

        foreach ($produkList as $produk) {
            $this->info("Produk aktif: {$produk->nama}");
            Log::channel('followup')->info("Memproses produk", [
                'produk_id' => $produk->id,
                'produk_nama' => $produk->nama,
            ]);

            $templates = TemplateFollup::active()
                ->where('produk_id', $produk->id)
                ->whereIn('type', ['1', '11', '14', '15', '18', '19'])
                ->get()
                ->sortBy(function ($t) {
                    return \App\Http\Controllers\Api\Sales\TemplateFollupController::eventSortKey($t->event ?? null);
                })
                ->values();

            foreach ($templates as $template) {
                $this->info("Templdate: {$template->nama} ({$template->event})");
                Log::channel('followup')->info("Memproses template", [
                    'template_id' => $template->id,
                    'template_nama' => $template->nama,
                    'template_event' => $template->event,
                    'template_type' => $template->type,
                ]);

                // Tentukan filter order berdasarkan type template
                $type = (string) ($template->type ?? '');

                if (in_array($type, ['1', '11', '14', '15'])) {
                    // Pending + Unpaid
                    $orders = OrderCustomer::with(['customer_rel'])
                        ->where('produk', $produk->id)
                        ->where('status_order', '1')
                        ->where(function ($q) {
                            $q->where('status_pembayaran', 0)
                                ->orWhereNull('status_pembayaran');
                        })
                        ->get();
                } elseif (in_array($type, ['16', '18'])) {
                    // Processing + DP (status_pembayaran = 4)
                    $orders = OrderCustomer::with(['customer_rel'])
                        ->where('produk', $produk->id)
                        ->where('status', '!=', 'N')
                        ->where('status_order', '2')
                        ->where('status_pembayaran', '4')
                        ->get();
                } elseif (in_array($type, ['17', '19'])) {
                    // Processing + Paid (status_pembayaran = 2)
                    $orders = OrderCustomer::with(['customer_rel'])
                        ->where('produk', $produk->id)
                        ->where('status', '!=', 'N')
                        ->where('status_order', '2')
                        ->where('status_pembayaran', '2')
                        ->get();
                } else {
                    $orders = collect();
                }

                $this->info("orders: {$orders->count()} ");
                $this->info("produk_id: {$produk->id} ");

                foreach ($orders as $order) {
                     $this->info("masuk ke order: {$order->customer_rel->nama}");
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

                    // Hitung target waktu kirim berdasarkan type
                    if (in_array($type, ['14', '15', '18', '19'])) {
                        // Timing berdasarkan jadwal_produk terdekat (Cek Jadwal Terdekat)
                        $jadwalTerdekat = \App\Models\ProdukJadwal::where('produk_id', $produk->id)
                            ->where('status', '1')
                            ->where('waktu_mulai', '>=', Carbon::today())
                            ->orderBy('waktu_mulai', 'asc')
                            ->first();

                        if (!$jadwalTerdekat) {
                            continue; // skip jika tidak ada jadwal terdekat yang aktif
                        }
                        
                        $targetTime = Carbon::parse($jadwalTerdekat->waktu_mulai)
                            ->subDays($jumlahHari)
                            ->setTimeFromTimeString($jamKirim);
                            
                        $eventDateCarbon = Carbon::parse($jadwalTerdekat->waktu_mulai);
                    } else {
                        // Default: timing berdasarkan tanggal order dibuat
                        $targetTime = Carbon::parse($order->tanggal)
                            ->addDays($jumlahHari)
                            ->setTimeFromTimeString($jamKirim);
                            
                        $eventDateCarbon = null;
                    }

                    if (Carbon::now()->lt($targetTime)) {
                        continue; // Belum waktunya
                    }

                    // Khusus H-3 dan H-1, jangan kirim jika tanggal event sudah lewat / kedaluwarsa.
                    if (in_array($type, ['14', '15']) && $eventDateCarbon) {
                        if (Carbon::now()->startOfDay()->gt($eventDateCarbon->startOfDay())) {
                            continue; // Sudah lewat tanggal event, jangan blast reminder usang
                        }
                    }

                    $sudahKirim = LogsFollup::where('follup', $template->id)
                        ->where('customer', $order->customer_rel->id)
                        ->where('order', $order->id)
                        ->where('type', $template->type)
                        ->exists();

                    if ($sudahKirim) continue;

                    $customData = json_decode($order->custom_value, true) ?? [];

                    $data = array_merge([
                        'customer_name' => $order->customer_rel->nama ?? '',
                        'product_name'  => $produk->nama ?? '',
                        'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
                        'order_total'   => number_format($order->total_harga, 0, ',', '.'),
                    ], $customData);

                    if (isset($jadwalTerdekat) && $jadwalTerdekat) {
                        $data['jadwal'] = trim(($jadwalTerdekat->nama_jadwal ?? '') . ' ' . Carbon::parse($jadwalTerdekat->waktu_mulai)->format('d-m-Y'));
                    }


                    $message = TemplateHelper::render($template->text, $data);

                    // Ambil woowa_key dari sales yang terkait dengan produk atau customer
                    $woowaKey = $this->getWoowaKeyFromSales($order->customer_rel, $order->produk);

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

                        $waSender = app(\App\Services\WhatsAppSenderService::class);
                        $salesId = $order->customer_rel->sales_id ?? null;
                        $response = $waSender->sendMessage($order->customer_rel->wa, $message, $salesId, $woowaKey);

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
                            'order'      => $order->id,
                            'type'       => $template->type,
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
                            'order'      => $order->id,
                            'type'       => $template->type,
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

            // =============================================
            // 2. UPSELLING (type 8) — H+ dari tanggal event jadwal lalu
            //    Target: order yang sudah Completed (status_order = 4)
            // =============================================
            $upsellingTemplates = TemplateFollup::active()
                ->where('produk_id', $produk->id)
                ->where('type', '8')
                ->get()
                ->sortBy(function ($t) {
                    return \App\Http\Controllers\Api\Sales\TemplateFollupController::eventSortKey($t->event ?? null);
                })
                ->values();

            if ($upsellingTemplates->isNotEmpty()) {
                // Cari jadwal produk terakhir yang sudah lewat (paling lalu), termasuk hari ini (untuk H+0)
                $jadwalSelesai = \App\Models\ProdukJadwal::where('produk_id', $produk->id)
                    ->where('status', '1')
                    ->whereDate('waktu_mulai', '<=', Carbon::today())
                    ->orderBy('waktu_mulai', 'desc')
                    ->first();

                if ($jadwalSelesai) {
                    $tanggalEventProduk = Carbon::parse($jadwalSelesai->waktu_mulai);
                    
                    // Ambil order Completed untuk produk ini
                    $completedOrders = OrderCustomer::with(['customer_rel'])
                        ->where('produk', $produk->id)
                        ->where('status', '!=', 'N')
                        ->where('status_order', '4') // Completed
                        ->get();

                    $this->info("Upselling — Completed orders: {$completedOrders->count()} | tanggal_event: {$tanggalEventProduk->toDateString()}");

                    foreach ($upsellingTemplates as $template) {
                        $this->info("Upselling Template: {$template->nama} ({$template->event})");
                        
                        try {
                            [$hariPart, $jamPart] = explode('-', $template->event);
                            $jumlahHari = (int) str_replace('d', '', strtolower($hariPart));
                            $jamKirim   = $jamPart ?? '09:00';
                        } catch (\Throwable $e) {
                            continue;
                        }

                        // Upselling: H+ dari tanggal event produk jadwal lalu
                        $targetTime = $tanggalEventProduk->copy()->addDays($jumlahHari)->setTimeFromTimeString($jamKirim);

                        if (Carbon::now()->lt($targetTime)) {
                            continue; // Belum waktunya
                        }

                        foreach ($completedOrders as $order) {
                            if (!$order->customer || !$order->customer_rel) continue;

                            $sudahKirim = LogsFollup::where('follup', $template->id)
                                ->where('customer', $order->customer_rel->id)
                                ->where('order', $order->id)
                                ->where('type', '8')
                                ->exists();

                            if ($sudahKirim) continue;

                            $customData = json_decode($order->custom_value, true) ?? [];

                            $data = array_merge([
                                'customer_name' => $order->customer_rel->nama ?? '',
                                'product_name'  => $produk->nama ?? '',
                                'order_date'    => Carbon::parse($order->create_at)->format('d-m-Y'),
                                'order_total'   => number_format($order->total_harga, 0, ',', '.'),
                                'event_date'    => $tanggalEventProduk->format('d-m-Y'),
                            ], $customData);

                            $message = TemplateHelper::render($template->text, $data);
                            // $woowaKey = $this->getWoowaKeyFromSales($order->customer_rel, $order->produk);
                            $woowaKey = \App\Models\SalesSetting::getWoowaUtama();

                            if ($debug) {
                                $this->line("[DEBUG UPSELLING] Kirim ke {$order->customer_rel->wa}: {$message}");
                                continue;
                            }

                            try {
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

                                $statusText = $response->successful() ? 'sukses' : 'gagal';
                                $keterangan = "Kirim WA upselling type 8 ke {$order->customer_rel->wa} ({$order->customer_rel->nama}). Status: {$statusText}. Pesan: {$message}";

                                LogsFollup::create([
                                    'follup'     => $template->id,
                                    'customer'   => $order->customer_rel->id,
                                    'order'      => $order->id,
                                    'type'       => '8',
                                    'keterangan' => $keterangan,
                                    'create_at'  => now(),
                                    'status'     => $response->successful() ? '1' : '0',
                                ]);

                            } catch (\Exception $e) {
                                LogsFollup::create([
                                    'follup'     => $template->id,
                                    'customer'   => $order->customer_rel->id,
                                    'order'      => $order->id,
                                    'type'       => '8',
                                    'keterangan' => "Gagal kirim upselling. Error: " . $e->getMessage(),
                                    'create_at'  => now(),
                                    'status'     => '0',
                                ]);
                            }
                        }
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

    /**
     * Ambil woowa_key dari sales berdasarkan produk atau customer
     * Jika tidak ditemukan, fallback ke env('WOOWA_KEY')
     */
    private function getWoowaKeyFromSales($customer, $produkId = null)
    {
        if ($produkId) {
            $produk = Produk::find($produkId);
            if ($produk) {
                $assignArray = $produk->assign;
                if (is_string($assignArray)) {
                    $assignArray = json_decode($assignArray, true);
                }
                if (is_array($assignArray) && !empty($assignArray)) {
                    // Check if customer sales_id is in assignArray
                    if ($customer && $customer->sales_id && in_array((int)$customer->sales_id, $assignArray)) {
                        $targetSalesId = $customer->sales_id;
                    } else {
                        $targetSalesId = $assignArray[0];
                    }
                    
                    $sales = Sales::where('user_id', $targetSalesId)->first();
                    if ($sales && $sales->woowa_key) {
                        return $sales->woowa_key;
                    }
                }
            }
        }

        if (!$customer || !$customer->sales_id) {
            return env('WOOWA_KEY');
        }

        $sales = Sales::where('user_id', $customer->sales_id)->first();
        
        if ($sales && $sales->woowa_key) {
            return $sales->woowa_key;
        }

        // Fallback ke env jika tidak ditemukan
        return env('WOOWA_KEY');
    }
}