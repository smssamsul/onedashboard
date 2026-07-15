<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\Produk;
use App\Models\TemplateFollup;
use App\Helpers\TemplateHelper;
use Carbon\Carbon;

class SendTrainerReminderCron extends Command
{
    /**
     * Command artisan
     */
    protected $signature = 'trainer:reminder {--debug : Mode debug tanpa kirim pesan WA ke trainer}';

    protected $description = 'Kirim reminder WhatsApp ke trainer berdasarkan template follup type 11 dan tanggal event produk.';

    public function handle()
    {
        $startTime = now();
        $this->info("=== Mulai proses reminder trainer ===");
        Log::channel('followup')->info("=== Mulai proses reminder trainer ===", [
            'timestamp' => $startTime->toDateTimeString(),
        ]);

        $debug = $this->option('debug');

        if ($debug) {
            $this->warn('⚠ Mode DEBUG aktif — pesan tidak akan dikirim ke WhatsApp');
            Log::channel('followup')->warning('Mode DEBUG aktif — pesan tidak akan dikirim ke WhatsApp (trainer reminder)');
        }

        $woowaKey = env('WOOWA_KEY');

        // Ambil produk yang aktif, punya trainer, dan tanggal_event belum lewat
        $produkList = Produk::with(['trainer_rel'])
            ->where('status', '1')
            ->whereNotNull('trainer')
            ->whereNotNull('tanggal_event')
            ->whereDate('tanggal_event', '>=', now()->toDateString())
            ->get();

        foreach ($produkList as $produk) {
            $this->info("Produk aktif: {$produk->nama}");
            Log::channel('followup')->info("Memproses reminder trainer untuk produk", [
                'produk_id'   => $produk->id,
                'produk_nama' => $produk->nama,
            ]);

            if (!$produk->trainer_rel) {
                $this->warn("Produk {$produk->nama} tidak memiliki relasi trainer_rel.");
                Log::channel('followup')->warning("Produk tidak punya relasi trainer_rel", [
                    'produk_id' => $produk->id,
                ]);
                continue;
            }

            if (empty($produk->trainer_rel->no_telp)) {
                $this->warn("Trainer {$produk->trainer_rel->nama} tidak memiliki nomor telepon.");
                Log::channel('followup')->warning("Trainer tidak punya no_telp", [
                    'produk_id'    => $produk->id,
                    'trainer_id'   => $produk->trainer_rel->id,
                    'trainer_nama' => $produk->trainer_rel->nama,
                ]);
                continue;
            }

            $template = TemplateFollup::active()
                ->where('produk_id', $produk->id)
                ->where('type', 11)
                ->first();

            if (!$template) {
                $this->warn("Template follup type 11 tidak ditemukan untuk produk {$produk->nama}");
                Log::channel('followup')->warning("Template type 11 tidak ditemukan untuk reminder trainer", [
                    'produk_id'   => $produk->id,
                    'produk_nama' => $produk->nama,
                ]);
                continue;
            }


            try {
                [$hariPart, $jamPart] = explode('-', $template->event);
                $jumlahHari = (int) str_replace('d', '', strtolower($hariPart));
                $jamKirim   = $jamPart ?? '09:00';
            } catch (\Throwable $e) {
                $this->warn("⚠ Format event tidak valid: {$template->event}");
                Log::channel('followup')->warning("Format event template trainer tidak valid", [
                    'template_id'   => $template->id,
                    'template_nama' => $template->nama,
                    'event'         => $template->event,
                    'error'         => $e->getMessage(),
                ]);
                continue;
            }

            if (empty($produk->tanggal_event)) {
                $this->warn("Produk {$produk->nama} tidak memiliki tanggal_event, skip reminder trainer.");
                Log::channel('followup')->warning("Produk tidak punya tanggal_event", [
                    'produk_id' => $produk->id,
                ]);
                continue;
            }

            $eventDate = Carbon::parse($produk->tanggal_event);

            if ($eventDate->endOfDay()->lt(now())) {
                Log::channel('followup')->info("Lewati reminder trainer karena tanggal_event sudah lewat", [
                    'produk_id'    => $produk->id,
                    'produk_nama'  => $produk->nama,
                    'tanggal_event'=> $eventDate->toDateString(),
                ]);
                continue;
            }

            $targetTime = $eventDate
                ->addDays($jumlahHari)
                ->setTimeFromTimeString($jamKirim);

            if (Carbon::now()->lt($targetTime)) {
                continue;
            }

            $data = [
                'trainer_name' => $produk->trainer_rel->nama ?? '',
                'product_name' => $produk->nama ?? '',
                'event_date'   => Carbon::parse($produk->tanggal_event)->format('d-m-Y'),
            ];

            $templateText = $template->text;

            if (!$templateText) {
                $templateText = "Halo {$produk->trainer_rel->nama}, Kami reminder jadwal {$produk->nama} tanggal {$produk->tanggal_event}";
            }

            $message = TemplateHelper::render($templateText, $data);

            if ($debug) {
                $this->line("[DEBUG] Reminder ke {$produk->trainer_rel->no_telp} ({$produk->trainer_rel->nama}): {$message}");
                Log::channel('followup')->debug("DEBUG: Reminder trainer akan dikirim", [
                    'produk_id'     => $produk->id,
                    'trainer_id'    => $produk->trainer_rel->id,
                    'trainer_nama'  => $produk->trainer_rel->nama,
                    'trainer_wa'    => $produk->trainer_rel->no_telp,
                    'template_id'   => $template->id,
                    'pesan'         => $message,
                ]);
                continue;
            }

            try {
                $waSender = app(\App\Services\WhatsAppSenderService::class);
                $response = $waSender->sendMessage($produk->trainer_rel->no_telp, $message, null, $woowaKey);

                if ($response->successful()) {
                    $this->info("Reminder terkirim ke trainer {$produk->trainer_rel->nama}");
                    Log::channel('followup')->info("Reminder trainer berhasil dikirim", [
                        'produk_id'       => $produk->id,
                        'trainer_id'      => $produk->trainer_rel->id,
                        'trainer_nama'    => $produk->trainer_rel->nama,
                        'trainer_wa'      => $produk->trainer_rel->no_telp,
                        'template_id'     => $template->id,
                        'response_status' => $response->status(),
                    ]);
                } else {
                    $this->warn("Gagal kirim reminder trainer ({$response->status()})");
                    Log::channel('followup')->error("Reminder trainer gagal dikirim", [
                        'produk_id'       => $produk->id,
                        'trainer_id'      => $produk->trainer_rel->id,
                        'trainer_nama'    => $produk->trainer_rel->nama,
                        'trainer_wa'      => $produk->trainer_rel->no_telp,
                        'template_id'     => $template->id,
                        'response_status' => $response->status(),
                        'response_body'   => $response->body(),
                    ]);
                }
            } catch (\Exception $e) {
                $this->error("⚠ Error kirim reminder trainer: " . $e->getMessage());
                Log::channel('followup')->error("Exception saat kirim reminder trainer", [
                    'produk_id'     => $produk->id,
                    'trainer_id'    => $produk->trainer_rel->id ?? null,
                    'trainer_nama'  => $produk->trainer_rel->nama ?? null,
                    'trainer_wa'    => $produk->trainer_rel->no_telp ?? null,
                    'template_id'   => $template->id,
                    'error_message' => $e->getMessage(),
                    'error_trace'   => $e->getTraceAsString(),
                ]);
            }
        }

        $endTime  = now();
        $duration = $endTime->diffInSeconds($startTime);
        $this->info("=== Proses reminder trainer selesai ===");
        Log::channel('followup')->info("=== Proses reminder trainer selesai ===", [
            'timestamp'        => $endTime->toDateTimeString(),
            'duration_seconds' => $duration,
        ]);

        return Command::SUCCESS;
    }
}


