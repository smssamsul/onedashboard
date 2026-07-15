<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\Sales;
use App\Models\SalesSetting;
use App\Services\BaileysService;
use Illuminate\Http\Request;

class BaileysController extends Controller
{
    private BaileysService $baileys;

    public function __construct(BaileysService $baileys)
    {
        $this->middleware('auth:api');
        $this->baileys = $baileys;
    }

    /**
     * GET /api/sales/baileys/sessions
     * List semua session Baileys.
     */
    public function listSessions()
    {
        $result = $this->baileys->listSessions();
        return response()->json($result);
    }

    /**
     * GET /api/sales/baileys/status/{sessionId}
     * Cek status koneksi suatu session.
     */
    public function getStatus(string $sessionId)
    {
        $result = $this->baileys->getStatus($sessionId);
        return response()->json($result);
    }

    /**
     * GET /api/sales/baileys/status-by-sales/{salesId}
     * Cek status koneksi berdasarkan sales ID (auto-resolve session ID).
     */
    public function getStatusBySales($salesId)
    {
        if ($salesId === 'global') {
            $sessionId = 'global';
            $result    = $this->baileys->getStatus($sessionId);
            return response()->json(array_merge($result, [
                'session_id' => $sessionId,
                'sales_id'   => null,
            ]));
        }

        $sales = Sales::find($salesId);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan',
            ], 404);
        }

        $sessionId = $sales->baileys_session_id ?: BaileysService::makeSessionId($sales->user_id);
        $result    = $this->baileys->getStatus($sessionId);

        return response()->json(array_merge($result, [
            'session_id' => $sessionId,
            'sales_id'   => $salesId,
        ]));
    }

    /**
     * GET /api/sales/baileys/qr/{sessionId}
     * Ambil QR code untuk session (hanya tersedia jika status = 'qr').
     */
    public function getQr(string $sessionId)
    {
        $result = $this->baileys->getQr($sessionId);
        return response()->json($result);
    }

    /**
     * GET /api/sales/baileys/qr-by-sales/{salesId}
     * Ambil QR code berdasarkan sales ID.
     * Jika session belum ada, otomatis buat session baru terlebih dahulu.
     */
    public function getQrBySales($salesId)
    {
        if ($salesId === 'global') {
            $sessionId = 'global';
            $status = $this->baileys->getStatus($sessionId);

            $isNotFound = ($status['status'] ?? '') === 'not_found' 
                || str_contains(strtolower($status['message'] ?? ''), 'disconnect') 
                || ($status['status'] ?? '') === 'disconnect';

            if (!($status['success'] ?? false) && $isNotFound) {
                $this->baileys->createSession($sessionId);
                sleep(1);
            }

            if (in_array(($status['status'] ?? ''), ['open', 'connected'])) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Session sudah terhubung, tidak perlu QR',
                    'status'     => 'open',
                    'session_id' => $sessionId,
                ]);
            }

            $result = $this->baileys->getQr($sessionId);
            return response()->json(array_merge($result, [
                'session_id' => $sessionId,
                'sales_id'   => null,
            ]));
        }

        $sales = Sales::find($salesId);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan',
            ], 404);
        }

        $sessionId = $sales->baileys_session_id ?: BaileysService::makeSessionId($sales->user_id);

        // Simpan session ID ke sales jika belum ada
        if (!$sales->baileys_session_id) {
            $sales->baileys_session_id = $sessionId;
            $sales->save();
        }

        // Cek status dulu
        $status = $this->baileys->getStatus($sessionId);

        $isNotFound = ($status['status'] ?? '') === 'not_found' 
            || str_contains(strtolower($status['message'] ?? ''), 'disconnect') 
            || ($status['status'] ?? '') === 'disconnect';

        // Jika session belum ada atau disconnect, buat dulu
        if (!($status['success'] ?? false) && $isNotFound) {
            $this->baileys->createSession($sessionId);
            // Tunggu sebentar agar session ter-init dan QR tersedia
            sleep(1);
        }

        // Jika sudah connected, tidak perlu QR
        if (in_array(($status['status'] ?? ''), ['open', 'connected'])) {
            return response()->json([
                'success'    => false,
                'message'    => 'Session sudah terhubung, tidak perlu QR',
                'status'     => 'open',
                'session_id' => $sessionId,
            ]);
        }

        $result = $this->baileys->getQr($sessionId);

        return response()->json(array_merge($result, [
            'session_id' => $sessionId,
            'sales_id'   => $salesId,
        ]));
    }

    /**
     * POST /api/sales/baileys/init/{sessionId}
     * Inisialisasi session baru.
     */
    public function createSession(string $sessionId)
    {
        $result = $this->baileys->createSession($sessionId);
        return response()->json($result);
    }

    /**
     * POST /api/sales/baileys/init-by-sales/{salesId}
     * Inisialisasi session berdasarkan sales ID.
     */
    public function createSessionBySales($salesId)
    {
        if ($salesId === 'global') {
            $sessionId = 'global';
            $result = $this->baileys->createSession($sessionId);
            return response()->json(array_merge($result, [
                'session_id' => $sessionId,
                'sales_id'   => null,
            ]));
        }

        $sales = Sales::find($salesId);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan',
            ], 404);
        }

        $sessionId = BaileysService::makeSessionId($sales->user_id);

        // Update sales record
        $sales->baileys_session_id = $sessionId;
        $sales->save();

        $result = $this->baileys->createSession($sessionId);

        return response()->json(array_merge($result, [
            'session_id' => $sessionId,
            'sales_id'   => $salesId,
        ]));
    }

    /**
     * DELETE /api/sales/baileys/session/{sessionId}
     * Logout / hapus session.
     */
    public function logout(string $sessionId)
    {
        $result = $this->baileys->logout($sessionId);
        return response()->json($result);
    }

    /**
     * DELETE /api/sales/baileys/session-by-sales/{salesId}
     * Logout session berdasarkan sales ID.
     */
    public function logoutBySales($salesId)
    {
        if ($salesId === 'global') {
            $sessionId = 'global';
            $result = $this->baileys->logout($sessionId);
            return response()->json(array_merge($result, [
                'session_id' => $sessionId,
                'sales_id'   => null,
            ]));
        }

        $sales = Sales::find($salesId);

        if (!$sales) {
            return response()->json([
                'success' => false,
                'message' => 'Sales tidak ditemukan',
            ], 404);
        }

        $sessionId = $sales->baileys_session_id ?: BaileysService::makeSessionId($sales->user_id);
        $result    = $this->baileys->logout($sessionId);

        // Reset session ID di sales record
        $sales->baileys_session_id = null;
        $sales->save();

        return response()->json(array_merge($result, [
            'session_id' => $sessionId,
            'sales_id'   => $salesId,
        ]));
    }

    /**
     * GET /api/sales/baileys/engine
     * Ambil engine WA yang sedang aktif.
     */
    public function getEngine()
    {
        $engine = SalesSetting::getWaEngine();

        return response()->json([
            'success' => true,
            'engine'  => $engine,
        ]);
    }
}
