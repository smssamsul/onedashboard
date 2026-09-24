<?php

namespace App\Console\Commands;

use App\Helpers\TemplateHelper;
use App\Models\LogsFollup;
use App\Services\PercakapanService;
use App\Services\WhatsAppSenderService;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Follow-up "backdate" ke peserta yang orderannya belum dibayar dan dibuat
 * SEBELUM baileys sales-nya pertama kali aktif - mereka tidak pernah kena
 * alur follow-up baileys sama sekali.
 *
 * Satu command = satu sales (satu nomor WA), jalankan dua proses paralel untuk
 * dua sales. Pengiriman dibatasi supaya nomor WA tidak dianggap spam:
 * jeda acak antar pesan (default 8-34 dtk) dan maksimal N pesan per jam
 * bergulir (default 90).
 *
 * Aman dijalankan ulang: customer yang sudah berhasil dikirimi (log
 * logs_follup type "backdate pending" status 1) dilewati. Berhenti kapan saja
 * lewat file storage/app/backdate/STOP.
 */
class BackdateFollowupPending extends Command
{
    protected $signature = 'followup:backdate-pending
        {--sales= : user_id sales pemilik nomor pengirim (21 atau 24)}
        {--dry-run : cuma hitung target dan tampilkan contoh pesan, tanpa kirim}
        {--limit=0 : batasi jumlah kirim (0 = semua), berguna untuk uji coba}
        {--max-per-hour=90 : batas pesan per jam bergulir per nomor}
        {--min-delay=8 : jeda minimum antar pesan (detik)}
        {--max-delay=34 : jeda maksimum antar pesan (detik)}
        {--jam-mulai=7 : jam WIB paling awal boleh kirim}
        {--jam-selesai=21 : jam WIB paling akhir boleh kirim}';

    protected $description = 'Follow-up backdate ke peserta pending pembayaran (order sebelum baileys sales aktif)';

    private const TIPE_LOG = 'backdate pending';

    /** user_id sales => kapan baileys-nya pertama kali terhubung (WIB), dari log wa-baileys. */
    private const BAILEYS_AKTIF = [
        21 => '2026-07-15 08:44:00',
        24 => '2026-07-13 10:18:00',
    ];

    private const TEMPLATE = "{Kemarin|Kemaren|Beberapa waktu lalu} {mau|ingin} belajar Bisnis Properti ya Kak {{customer_name}}. {Cocok|Pas|Tepat} {sih|banget|nih}, {apalagi|apa lagi|terlebih}  2027 sudah mulai mantap dunia Properti ini.\n\n{Yuk|Ayo|Mari} {siap2|siap-siap|bersiap}  dari sekarang {ambil|raih|manfaatkan} peluang nya.";

    public function handle(WhatsAppSenderService $sender, PercakapanService $percakapan): int
    {
        $userId = (int) $this->option('sales');
        if (!isset(self::BAILEYS_AKTIF[$userId])) {
            $this->error('--sales harus salah satu dari: ' . implode(', ', array_keys(self::BAILEYS_AKTIF)));
            return self::FAILURE;
        }

        $dryRun = (bool) $this->option('dry-run');
        $limit = (int) $this->option('limit');
        $maxPerHour = max(1, (int) $this->option('max-per-hour'));
        $minDelay = max(1, (int) $this->option('min-delay'));
        $maxDelay = max($minDelay, (int) $this->option('max-delay'));
        $jamMulai = (int) $this->option('jam-mulai');
        $jamSelesai = (int) $this->option('jam-selesai');

        $dir = storage_path('app/backdate');
        File::ensureDirectoryExists($dir);
        $stopFile = $dir . '/STOP';
        $progressFile = $dir . "/progress_{$userId}.json";

        $targets = $this->cariTarget($userId);
        $this->info("Sales {$userId}: " . count($targets['list']) . " target (dilewati: " . json_encode($targets['dilewati']) . ')');

        if ($dryRun) {
            foreach (array_slice($targets['list'], 0, 3) as $t) {
                $this->line('--- contoh untuk ***' . substr($t['phone'], -4) . ' ---');
                $this->line($this->susunPesan($t['nama']));
            }
            return self::SUCCESS;
        }

        $total = $limit > 0 ? min($limit, count($targets['list'])) : count($targets['list']);
        $progress = ['sales' => $userId, 'total' => $total, 'berhasil' => 0, 'gagal' => 0, 'mulai' => now()->toDateTimeString(),
            'terakhir' => null, 'status' => 'berjalan', 'setting' => compact('maxPerHour', 'minDelay', 'maxDelay', 'jamMulai', 'jamSelesai')];
        $tulis = function () use (&$progress, $progressFile) {
            File::put($progressFile, json_encode($progress, JSON_PRETTY_PRINT));
        };
        $tulis();

        $kirimTerakhir = [];   // timestamp pengiriman dalam 1 jam terakhir
        $gagalBeruntun = 0;
        $diproses = 0;

        foreach ($targets['list'] as $t) {
            if ($diproses >= $total) {
                break;
            }

            // Tunggu sampai jam kirim yang diizinkan, dan sampai kuota per jam longgar.
            while (true) {
                if (File::exists($stopFile)) {
                    $progress['status'] = 'dihentikan (file STOP)';
                    $tulis();
                    $this->warn('File STOP ditemukan, berhenti.');
                    return self::SUCCESS;
                }
                $jam = (int) now()->format('G');
                if ($jam < $jamMulai || $jam >= $jamSelesai) {
                    $progress['status'] = "menunggu jam kirim ({$jamMulai}-{$jamSelesai} WIB)";
                    $tulis();
                    sleep(60);
                    continue;
                }
                $kirimTerakhir = array_values(array_filter($kirimTerakhir, fn ($ts) => $ts > time() - 3600));
                if (count($kirimTerakhir) >= $maxPerHour) {
                    $progress['status'] = 'menunggu kuota per jam';
                    $tulis();
                    sleep(max(5, min(60, $kirimTerakhir[0] + 3600 - time() + 1)));
                    continue;
                }
                break;
            }
            $progress['status'] = 'berjalan';

            $pesan = $this->susunPesan($t['nama']);
            $berhasil = false;
            $err = null;
            try {
                $sender->sendMessage($t['phone'], $pesan, $userId);
                $berhasil = true;
            } catch (\Throwable $e) {
                $err = $e->getMessage();
            }

            $kirimTerakhir[] = time();
            $diproses++;

            LogsFollup::create([
                'follup' => null,
                'customer' => $t['customer'],
                'order' => $t['order'],
                'type' => self::TIPE_LOG,
                'keterangan' => "Kirim WA backdate pending ke {$t['phone']} ({$t['nama']}). Status: " . ($berhasil ? 'berhasil' : 'gagal')
                    . ". Pesan: {$pesan}" . ($berhasil ? '' : "\nResponse: Error: {$err}"),
                'create_at' => now()->toDateTimeString(),
                'status' => $berhasil ? '1' : '0',
            ]);

            if ($berhasil) {
                $gagalBeruntun = 0;
                $progress['berhasil']++;
                try {
                    $percakapan->logOutgoingMessage($t['phone'], $userId, $pesan, 'followup');
                } catch (\Throwable $e) {
                    $this->warn('Gagal mencatat ke percakapan: ' . $e->getMessage());
                }
            } else {
                $gagalBeruntun++;
                $progress['gagal']++;
                $this->error("Gagal kirim ke ***" . substr($t['phone'], -4) . ": {$err}");
                if ($gagalBeruntun >= 3) {
                    $progress['status'] = 'DIHENTIKAN: 3 gagal beruntun (' . $err . ')';
                    $tulis();
                    return self::FAILURE;
                }
            }

            $progress['terakhir'] = now()->toDateTimeString();
            $tulis();
            $this->line(now()->format('H:i:s') . " [{$progress['berhasil']}/{$total}] " . ($berhasil ? 'ok' : 'GAGAL') . ' ***' . substr($t['phone'], -4));

            if ($diproses < $total) {
                sleep(random_int($minDelay, $maxDelay));
            }
        }

        $progress['status'] = 'selesai';
        $tulis();
        $this->info("Selesai. Berhasil {$progress['berhasil']}, gagal {$progress['gagal']}.");

        return self::SUCCESS;
    }

    /** Render spintext lalu rapikan spasi ganda (template sengaja mengandung "  "). */
    private function susunPesan(string $nama): string
    {
        $teks = TemplateHelper::render(self::TEMPLATE, ['customer_name' => trim($nama)]);
        $teks = preg_replace('/[ \t]+/', ' ', $teks);

        return trim(preg_replace('/ *\n */', "\n", $teks));
    }

    /**
     * Customer dengan order belum dibayar (status_pembayaran 0/null) yang dibuat
     * sebelum baileys sales-nya aktif. Customer yang sudah membayar order lain,
     * yang sudah pernah berhasil dikirimi command ini, nomornya tidak valid,
     * atau namanya kosong dilewati. Satu customer/nomor = satu pesan.
     */
    private function cariTarget(int $userId): array
    {
        $aktifSejak = self::BAILEYS_AKTIF[$userId];

        $sudahBayar = DB::table('order_customer')->where('status', '<>', 'N')
            ->whereIn('status_pembayaran', ['1', '2'])->pluck('customer')->flip();
        $sudahDikirim = DB::table('logs_follup')->where('type', self::TIPE_LOG)->where('status', '1')
            ->pluck('customer')->flip();

        $rows = DB::table('order_customer as o')
            ->join('customer as c', 'c.id', '=', 'o.customer')
            ->where('o.status', '<>', 'N')
            ->where(function ($q) {
                $q->where('o.status_pembayaran', '0')->orWhereNull('o.status_pembayaran');
            })
            ->where('o.sales_id', $userId)
            ->where('o.create_at', '<', $aktifSejak)
            ->orderByDesc('o.create_at')
            ->get(['o.id as order_id', 'o.customer', 'c.nama', 'c.wa']);

        $dilewati = ['sudah_bayar_order_lain' => 0, 'sudah_dikirim' => 0, 'nomor_tidak_valid' => 0, 'nama_kosong' => 0, 'nomor_dobel' => 0];
        $list = [];
        $phoneDipakai = [];
        foreach ($rows as $r) {
            if (array_key_exists($r->customer, $list)) {
                continue; // order lebih lama dari customer yang sama (atau sudah diputuskan dilewati)
            }
            if (isset($sudahBayar[$r->customer])) { $dilewati['sudah_bayar_order_lain']++; $list[$r->customer] = null; continue; }
            if (isset($sudahDikirim[$r->customer])) { $dilewati['sudah_dikirim']++; $list[$r->customer] = null; continue; }

            $w = preg_replace('/\D/', '', (string) $r->wa);
            if (str_starts_with($w, '0')) {
                $w = '62' . substr($w, 1);
            } elseif (str_starts_with($w, '8')) {
                $w = '62' . $w;
            }
            if (!str_starts_with($w, '62') || strlen($w) < 10 || strlen($w) > 15) { $dilewati['nomor_tidak_valid']++; $list[$r->customer] = null; continue; }
            if (trim((string) $r->nama) === '') { $dilewati['nama_kosong']++; $list[$r->customer] = null; continue; }
            if (isset($phoneDipakai[$w])) { $dilewati['nomor_dobel']++; $list[$r->customer] = null; continue; }

            $phoneDipakai[$w] = true;
            $list[$r->customer] = ['customer' => $r->customer, 'order' => $r->order_id, 'nama' => trim($r->nama), 'phone' => $w];
        }

        return ['list' => array_values(array_filter($list)), 'dilewati' => $dilewati];
    }
}
