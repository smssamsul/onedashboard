<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Google\Client;
use Google\Service\PeopleService;

class GoogleContactService
{
    protected Client $client;
    protected PeopleService $peopleService;

    /**
     * Kata-kata generik/placeholder yang tidak layak sebagai nama kontak.
     */
    protected array $blacklist = [
        'kak', 'kakak', 'sis', 'bro', 'bang', 'pak', 'bu', 'mas', 'dek',
        'sayang', 'dear', 'halo', 'hi', 'hai', 'customer', '-', '.', '_',
    ];

    public function __construct()
    {
        $this->client = new Client();
        $this->client->setClientId(config('google.client_id'));
        $this->client->setClientSecret(config('google.client_secret'));
        $this->client->setRedirectUri(config('google.redirect_uri'));
        $this->client->addScope(PeopleService::CONTACTS);
        $this->client->setAccessType('offline');

        // Set token dari refresh token
        $refreshToken = config('google.refresh_token');
        if ($refreshToken) {
            $this->client->refreshToken($refreshToken);
        }

        $this->peopleService = new PeopleService($this->client);
    }

    /**
     * Cek apakah Google Client sudah dikonfigurasi dengan Client ID, Client Secret, dan Refresh Token.
     */
    public function isReady(): bool
    {
        $clientId = config('google.client_id');
        $clientSecret = config('google.client_secret');

        if (empty($clientId) || empty($clientSecret)) {
            return false;
        }

        $refreshToken = config('google.refresh_token');
        
        return !empty($refreshToken);
    }

    /**
     * Cek apakah nomor WA sudah ada di Google Contacts.
     * Return true jika sudah ada, false jika belum.
     */
    public function findContactByPhone(string $phone): bool
    {
        if (!$this->isReady()) {
            return false;
        }

        try {
            $normalizedPhone = $this->normalizePhone($phone);

            // Cari semua kontak yang punya nomor telepon
            $connections = $this->peopleService->people_connections->listPeopleConnections(
                'people/me',
                [
                    'personFields' => 'phoneNumbers,names',
                    'pageSize'     => 1000,
                ]
            );

            foreach ($connections->getConnections() ?? [] as $person) {
                foreach ($person->getPhoneNumbers() ?? [] as $phoneObj) {
                    $existingPhone = $this->normalizePhone($phoneObj->getValue());
                    if ($existingPhone === $normalizedPhone) {
                        return true; // Sudah ada
                    }
                }
            }

            return false; // Belum ada
        } catch (\Exception $e) {
            $this->handleGoogleException($e);
            Log::error('GoogleContactService: Error saat findContactByPhone', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);
            // Jika error, anggap belum ada supaya tetap disimpan
            return false;
        }
    }

    /**
     * Buat kontak baru di Google Contacts.
     */
    public function createContact(string $name, string $phone): bool
    {
        if (!$this->isReady()) {
            return false;
        }

        try {
            $resolvedName = $this->resolveContactName($name, $phone);

            $person = new \Google\Service\PeopleService\Person();

            // Set nama
            $personName = new \Google\Service\PeopleService\Name();
            $personName->setDisplayName($resolvedName);
            $personName->setGivenName($resolvedName);
            $person->setNames([$personName]);

            // Set nomor telepon
            $phoneNumber = new \Google\Service\PeopleService\PhoneNumber();
            $phoneNumber->setValue('+' . $this->normalizePhone($phone));
            $phoneNumber->setType('mobile');
            $person->setPhoneNumbers([$phoneNumber]);

            $this->peopleService->people->createContact($person);

            Log::info('GoogleContactService: Kontak berhasil dibuat', [
                'name'  => $resolvedName,
                'phone' => $phone,
            ]);

            return true;
        } catch (\Exception $e) {
            $this->handleGoogleException($e);
            Log::error('GoogleContactService: Gagal membuat kontak', [
                'name'  => $name,
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Resolve nama yang layak untuk disimpan ke kontak.
     * Jika nama placeholder/blacklist → fallback ke "Customer WA {nomor}".
     */
    public function resolveContactName(string $nama, string $wa): string
    {
        $trimmed = trim($nama);
        $lower   = strtolower($trimmed);

        // Cek: terlalu pendek atau ada di blacklist
        if (mb_strlen($trimmed) < 3 || in_array($lower, $this->blacklist)) {
            return 'Customer WA ' . $this->normalizePhone($wa);
        }

        return $trimmed;
    }

    /**
     * Normalisasi nomor telepon ke format internasional tanpa +.
     * Contoh: "0812xxx" → "62812xxx", "+62812xxx" → "62812xxx"
     */
    public function normalizePhone(string $phone): string
    {
        // Hapus semua karakter non-digit
        $digits = preg_replace('/\D/', '', $phone);

        if (str_starts_with($digits, '0')) {
            $digits = '62' . substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Generate URL otorisasi OAuth untuk setup awal.
     */
    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    /**
     * Tukar authorization code dengan access token + refresh token.
     */
    public function exchangeCode(string $code): array
    {
        $token = $this->client->fetchAccessTokenWithAuthCode($code);
        return $token;
    }

    /**
     * Handle error dari Google API (khususnya 401 UNAUTHENTICATED)
     */
    protected function handleGoogleException(\Exception $e)
    {
        $message = $e->getMessage();
        $code = $e->getCode();
        
        if ($code == 401 || str_contains($message, 'UNAUTHENTICATED') || str_contains($message, 'CREDENTIALS_MISSING') || str_contains($message, 'Login Required')) {
            $this->removeRefreshTokenFromEnv();
        }
    }

    /**
     * Hapus value GOOGLE_REFRESH_TOKEN dari .env jika token tidak valid/expired
     */
    protected function removeRefreshTokenFromEnv()
    {
        $envPath = base_path('.env');
        if (file_exists($envPath)) {
            $content = file_get_contents($envPath);
            $newContent = preg_replace('/^GOOGLE_REFRESH_TOKEN=.*$/m', 'GOOGLE_REFRESH_TOKEN=', $content);
            
            if ($content !== $newContent) {
                file_put_contents($envPath, $newContent);
                Log::info('GoogleContactService: GOOGLE_REFRESH_TOKEN dihapus dari .env karena terdeteksi invalid/unauthenticated.');
            }
        }
    }
}
