<?php

namespace App\Console\Commands;

use App\Services\GoogleContactService;
use Illuminate\Console\Command;

class GoogleAuthCommand extends Command
{
    protected $signature   = 'google:auth';
    protected $description = 'Generate URL otorisasi Google OAuth2 untuk setup koneksi Google Contacts (jalankan sekali saja)';

    public function __construct(protected GoogleContactService $googleContact)
    {
        parent::__construct();
    }

    public function handle(): int
    {
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('  Google Contacts OAuth2 — Setup Awal');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('');

        // Cek apakah refresh token sudah ada
        $existingToken = config('google.refresh_token');
        if ($existingToken) {
            $this->warn('⚠️  GOOGLE_REFRESH_TOKEN sudah ada di .env.');
            if (!$this->confirm('Apakah Anda ingin generate ulang token? (ini akan menggantikan token yang ada)')) {
                $this->info('Dibatalkan. Token yang ada tetap dipakai.');
                return self::SUCCESS;
            }
            $this->info('');
            $this->warn('Sebelum lanjut, silakan revoke akses di:');
            $this->line('  https://myaccount.google.com/permissions');
            $this->info('Cari "Sales Dashboard Contacts" dan klik Remove Access.');
            $this->info('');
            $this->confirm('Sudah di-revoke? Lanjutkan?');
        }

        $authUrl = $this->googleContact->getAuthUrl();

        $this->info('Buka URL berikut di browser Anda:');
        $this->info('');
        $this->line('  ' . $authUrl);
        $this->info('');
        $this->info('Langkah:');
        $this->line('  1. Buka URL di atas di browser');
        $this->line('  2. Login dengan akun Gmail bisnis');
        $this->line('  3. Klik "Allow" / "Izinkan"');
        $this->line('  4. Browser akan redirect ke: ' . config('google.redirect_uri'));
        $this->line('  5. Halaman akan menampilkan "✅ Google OAuth berhasil!"');
        $this->line('  6. GOOGLE_REFRESH_TOKEN otomatis tersimpan di .env');
        $this->info('');
        $this->info('═══════════════════════════════════════════════════════');
        $this->info('Setelah selesai, jalankan:');
        $this->line('  php artisan queue:work redis --queue=default');
        $this->info('═══════════════════════════════════════════════════════');

        return self::SUCCESS;
    }
}
