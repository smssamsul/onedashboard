<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OpenaiPixel;
use App\Models\OrderCustomer;
use App\Models\PixelCheckLog;
use App\Models\Produk;
use App\Services\OpenaiConversionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

/**
 * Pengaturan pixel iklan ChatGPT (menu Pixel ChatGPT) + endpoint publik
 * penerima event dari landing page / halaman payment, yang diteruskan ke
 * OpenAI Conversions API.
 */
class OpenaiPixelController extends Controller
{
    /** Event yang boleh dikirim dari browser ke endpoint publik. */
    private const EVENT_DIIZINKAN = ['page_viewed', 'contents_viewed', 'checkout_started', 'lead_created', 'order_created'];

    public function __construct()
    {
        $this->middleware('auth:api')->except('event');
    }

    public function index()
    {
        return response()->json([
            'success' => true,
            'data' => OpenaiPixel::orderBy('id')->get(),
            'produk_options' => Produk::where('status', '!=', 'N')->orderBy('nama')->get(['id', 'nama', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validasi($request);
        if ($data instanceof \Illuminate\Http\JsonResponse) {
            return $data;
        }

        $pixel = OpenaiPixel::create($data);

        return response()->json(['success' => true, 'message' => 'Pixel ChatGPT berhasil ditambahkan', 'data' => $pixel], 201);
    }

    public function update(Request $request, $id)
    {
        $pixel = OpenaiPixel::find($id);
        if (!$pixel) {
            return response()->json(['success' => false, 'message' => 'Pixel tidak ditemukan'], 404);
        }

        $data = $this->validasi($request);
        if ($data instanceof \Illuminate\Http\JsonResponse) {
            return $data;
        }

        // API key tidak pernah dikirim balik ke frontend, jadi field kosong
        // berarti "jangan diubah" - kecuali user eksplisit minta dihapus.
        if (!$request->filled('capi_key')) {
            unset($data['capi_key']);
        }
        if ($request->boolean('hapus_capi_key')) {
            $data['capi_key'] = null;
        }

        $pixel->update($data);

        return response()->json(['success' => true, 'message' => 'Pixel ChatGPT berhasil diupdate', 'data' => $pixel->fresh()]);
    }

    public function destroy($id)
    {
        $pixel = OpenaiPixel::find($id);
        if (!$pixel) {
            return response()->json(['success' => false, 'message' => 'Pixel tidak ditemukan'], 404);
        }

        $pixel->delete();

        return response()->json(['success' => true, 'message' => 'Pixel ChatGPT berhasil dihapus']);
    }

    /**
     * Tes Conversions API key: kirim 1 event page_viewed dengan validate_only
     * (divalidasi OpenAI tapi tidak disimpan / tidak masuk laporan).
     */
    public function test($id, OpenaiConversionService $service)
    {
        $pixel = OpenaiPixel::find($id);
        if (!$pixel) {
            return response()->json(['success' => false, 'message' => 'Pixel tidak ditemukan'], 404);
        }

        $hasil = $service->kirim($pixel, [
            'id' => 'tes-koneksi-' . now()->timestamp,
            'type' => 'page_viewed',
            'timestamp_ms' => (int) floor(microtime(true) * 1000),
            'action_source' => 'web',
            'source_url' => rtrim(config('app.frontend_url', 'https://app.ternakproperti.com'), '/') . '/',
            'user' => ['ip_address' => request()->ip(), 'user_agent' => (string) request()->userAgent()],
            'data' => ['type' => 'contents', 'contents' => [['id' => 'tes', 'name' => 'Tes koneksi', 'content_type' => 'page']]],
        ], true);

        return response()->json([
            'success' => $hasil['ok'],
            'message' => $hasil['ok'] ? 'Koneksi Conversions API berhasil (event uji tidak disimpan)' : 'Tes gagal: ' . ($hasil['status'] ? "HTTP {$hasil['status']} " : '') . $hasil['body'],
        ]);
    }

    /**
     * Endpoint publik: dipanggil landing page / halaman payment setelah event
     * dikirim lewat pixel browser. Diteruskan ke Conversions API dengan id
     * event yang sama (dedup), lalu dicatat di Log Pixel.
     *
     * Nilai order & data customer diambil dari database, bukan dari request,
     * supaya endpoint publik ini tidak bisa dipakai mengirim angka palsu.
     */
    public function event(Request $request, OpenaiConversionService $service)
    {
        $v = Validator::make($request->all(), [
            'pixel_id' => 'required|string|max:100',
            'event_type' => 'required|string|in:' . implode(',', self::EVENT_DIIZINKAN),
            'event_id' => 'required|string|max:100',
            'produk_id' => 'required|integer',
            'order_id' => 'nullable|integer',
            'oppref' => 'nullable|string|max:500',
            'obref' => 'nullable|string|max:200',
            'source_url' => 'nullable|string|max:2000',
            'browser_ok' => 'nullable|boolean',
        ]);
        if ($v->fails()) {
            return response()->json(['success' => false, 'errors' => $v->errors()], 422);
        }

        $produkId = (int) $request->produk_id;
        $pixel = OpenaiPixel::untukProduk($produkId)->firstWhere('pixel_id', $request->pixel_id);
        $produk = Produk::find($produkId, ['id', 'nama', 'harga_asli']);
        if (!$pixel || !$produk) {
            return response()->json(['success' => false, 'message' => 'Pixel tidak berlaku untuk produk ini'], 404);
        }

        $type = $request->event_type;
        $eventId = $request->event_id;
        $order = null;
        $user = array_filter([
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'obref' => $request->obref,
        ]);
        $contents = [['id' => (string) $produk->id, 'name' => (string) $produk->nama, 'content_type' => 'product', 'quantity' => 1]];

        if ($type === 'order_created') {
            $order = OrderCustomer::with('customer_rel:id,nama,email,wa')
                ->where('id', $request->order_id)->where('produk', $produkId)->where('status', '!=', 'N')->first();
            if (!$order) {
                return response()->json(['success' => false, 'message' => 'Order tidak valid'], 422);
            }
            $eventId = 'order-' . $order->id; // harus sama dengan event_id di browser (lihat lib/openaiPixel.js)
            $cust = $order->customer_rel;
            $user += array_filter([
                'emails_sha256' => array_values(array_filter([OpenaiConversionService::hashEmail($cust->email ?? null)])),
                'phone_numbers_sha256' => array_values(array_filter([OpenaiConversionService::hashPhone($cust->wa ?? null)])),
                'external_ids_sha256' => $cust ? [hash('sha256', 'customer-' . $cust->id)] : [],
            ]);
            $data = ['type' => 'contents', 'amount' => OpenaiConversionService::amount($order->total_harga), 'currency' => 'IDR', 'contents' => $contents];
        } elseif ($type === 'lead_created') {
            $data = ['type' => 'customer_action'];
        } elseif ($type === 'page_viewed') {
            $data = ['type' => 'contents', 'contents' => $contents];
        } else { // contents_viewed, checkout_started
            $harga = (float) $produk->harga_asli;
            $data = ['type' => 'contents', 'contents' => $contents]
                + ($harga > 0 ? ['amount' => OpenaiConversionService::amount($harga), 'currency' => 'IDR'] : []);
        }

        $event = array_filter([
            'id' => $eventId,
            'type' => $type,
            'timestamp_ms' => (int) floor(microtime(true) * 1000),
            'action_source' => 'web',
            'source_url' => $request->source_url,
            'oppref' => $request->oppref,
            'user' => $user,
            'data' => $data,
        ], fn ($v) => $v !== null && $v !== '');

        $capi = $pixel->punya_capi_key ? $service->kirim($pixel, $event) : null;
        $browserOk = $request->boolean('browser_ok', true);
        $ok = $capi ? $capi['ok'] : $browserOk;

        PixelCheckLog::create([
            'order_id' => $order?->id,
            'produk_id' => $produkId,
            'pixel_id' => $pixel->pixel_id,
            'event_name' => $type,
            'source' => $type === 'order_created' ? 'chatgpt_payment_page' : 'chatgpt_landing_page',
            'status' => $ok ? '1' : '0',
            'payload' => [
                'platform' => 'chatgpt',
                'event_id' => $eventId,
                'browser_pixel' => $browserOk ? 'terkirim' : 'tidak terkirim (terblokir, atau bukan pixel utama di halaman)',
                'conversions_api' => $capi === null ? 'tidak dipakai (API key kosong)' : ($capi['ok'] ? 'terkirim' : 'gagal: ' . ($capi['status'] ? "HTTP {$capi['status']} " : '') . mb_substr($capi['body'], 0, 300)),
                'ada_oppref' => !empty($request->oppref),
                'amount' => $data['amount'] ?? null,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'create_at' => now(),
            'update_at' => now(),
        ]);

        return response()->json(['success' => true]);
    }

    private function validasi(Request $request)
    {
        $v = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'pixel_id' => 'required|string|max:100',
            'capi_key' => 'nullable|string|max:2000',
            'semua_produk' => 'required|boolean',
            'produk_ids' => 'nullable|array',
            'produk_ids.*' => 'integer',
            'aktif' => 'required|boolean',
        ]);

        if ($v->fails()) {
            return response()->json(['success' => false, 'message' => $v->errors()->first(), 'errors' => $v->errors()], 422);
        }

        $semua = $request->boolean('semua_produk');
        if (!$semua && empty($request->produk_ids)) {
            return response()->json(['success' => false, 'message' => 'Pilih minimal 1 produk, atau aktifkan "Semua produk".'], 422);
        }

        return [
            'nama' => trim($request->nama),
            'pixel_id' => trim($request->pixel_id),
            'capi_key' => $request->filled('capi_key') ? trim($request->capi_key) : null,
            'semua_produk' => $semua,
            'produk_ids' => $semua ? null : array_values(array_unique(array_map('intval', $request->produk_ids))),
            'aktif' => $request->boolean('aktif'),
        ];
    }
}
