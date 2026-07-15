<?php

namespace App\Http\Controllers;

use App\Services\GoogleContactService;
use Illuminate\Http\Request;

class GoogleOAuthController extends Controller
{
    public function __construct(protected GoogleContactService $googleContact) {}

    /**
     * Tangkap authorization code dari Google redirect,
     * tukar dengan refresh token, lalu simpan ke .env.
     */
    public function callback(Request $request)
    {
        $code = $request->query('code');

        if (!$code) {
            return response('<h2>❌ Error: Authorization code tidak ditemukan.</h2>', 400)
                ->header('Content-Type', 'text/html');
        }

        try {
            $token = $this->googleContact->exchangeCode($code);

            if (isset($token['error'])) {
                return response(
                    '<h2>❌ Error dari Google: ' . htmlspecialchars($token['error_description'] ?? $token['error']) . '</h2>',
                    400
                )->header('Content-Type', 'text/html');
            }

            $refreshToken = $token['refresh_token'] ?? null;

            if (!$refreshToken) {
                return response(
                    '<h2>⚠️ Refresh token tidak ditemukan. Pastikan Anda sudah revoke akses sebelumnya di <a href="https://myaccount.google.com/permissions">Google Account Permissions</a> lalu coba lagi.</h2>',
                    400
                )->header('Content-Type', 'text/html');
            }

            // Tulis refresh token ke file .env
            $this->updateEnvFile('GOOGLE_REFRESH_TOKEN', $refreshToken);

            return response(
                '<h2>✅ Google OAuth berhasil!</h2>
                <p>Refresh token sudah tersimpan ke file .env.</p>
                <p>Sekarang Anda bisa menutup tab ini. Sistem akan otomatis sync kontak ke Google Contacts setiap kali ada order baru.</p>
                <hr>
                <p><small>Refresh Token: <code>' . substr($refreshToken, 0, 20) . '...</code></small></p>'
            )->header('Content-Type', 'text/html');

        } catch (\Exception $e) {
            return response(
                '<h2>❌ Exception: ' . htmlspecialchars($e->getMessage()) . '</h2>',
                500
            )->header('Content-Type', 'text/html');
        }
    }

    /**
     * Update atau tambah nilai di file .env.
     */
    protected function updateEnvFile(string $key, string $value): void
    {
        $envPath = base_path('.env');
        $content = file_get_contents($envPath);

        // Escape karakter khusus untuk regex
        $escapedKey = preg_quote($key, '/');

        if (preg_match("/^{$escapedKey}=.*/m", $content)) {
            // Update nilai yang sudah ada
            $content = preg_replace(
                "/^{$escapedKey}=.*/m",
                "{$key}={$value}",
                $content
            );
        } else {
            // Tambah baris baru
            $content .= "\n{$key}={$value}\n";
        }

        file_put_contents($envPath, $content);

        // Clear config cache agar nilai baru terbaca
        \Illuminate\Support\Facades\Artisan::call('config:clear');
    }
    public function status()
    {
        $hasToken = !empty(env('GOOGLE_REFRESH_TOKEN'));
        return response()->json([
            'connected' => $hasToken
        ]);
    }

    public function getAuthUrl()
    {
        $url = $this->googleContact->getAuthUrl();
        return response()->json([
            'url' => $url
        ]);
    }

    public function disconnect()
    {
        $this->removeEnvFile('GOOGLE_REFRESH_TOKEN');
        return response()->json([
            'message' => 'Berhasil logout dari Google dan menghapus token.'
        ]);
    }

    /**
     * Hapus kunci dari file .env.
     */
    protected function removeEnvFile(string $key): void
    {
        $envPath = base_path('.env');
        if (!file_exists($envPath)) return;

        $content = file_get_contents($envPath);
        $escapedKey = preg_quote($key, '/');

        if (preg_match("/^{$escapedKey}=.*/m", $content)) {
            // Hapus baris
            $content = preg_replace("/^{$escapedKey}=.*\n?/m", "", $content);
            file_put_contents($envPath, $content);

            // Clear config cache agar nilai baru terbaca
            \Illuminate\Support\Facades\Artisan::call('config:clear');
        }
    }
}
