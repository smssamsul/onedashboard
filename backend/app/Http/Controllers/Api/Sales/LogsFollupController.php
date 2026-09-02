<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LogsFollup;
use App\Models\TemplateFollup;
use App\Models\Sales;
use App\Helpers\TemplateHelper;
use App\Services\WhatsAppSenderService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class LogsFollupController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api');
    }
    
     public function index(Request $request)
    {
        $tanggal = $request->query('tanggal');

        $query = LogsFollup::with([
            'follup_rel',
            'customer_rel:id,nama,wa']);

        if ($tanggal) {
            $query->whereDate('create_at', $tanggal);
        }

        $logs = $query->orderBy('create_at', 'desc')->get();

        return response()->json([
            'message' => 'Data logs follow up berhasil diambil',
            'total' => $logs->count(),
            'data' => $logs
        ]);
    }


    public function show(Request $request)
    {
        // $tanggal = $request->query('tanggal');
        // $customerId = $request->query('customer_id');
        // $event = $request->query('event');
        

        $logs = LogsFollup::with([
            'follup_rel',
            'customer_rel:id,nama,wa'
        ]);

        if($request->customer){
            $logs->where('customer', $request->customer);
        }

        if($request->tanggal){
            $logs->where('create_at', $request->tanggal);
        }

        if($request->event){
            $logs->whereHas('follup_rel', fn($q) => $q->where('event', $request->event));
        }

        $logs = $logs->orderByDesc('create_at')->get();

        return response()->json([
            'message' => 'Data logs follow up berhasil diambil',
            'total' => $logs->count(),
            'data' => $logs
        ]);
    }

    /**
     * Kirim ulang satu follow-up yang gagal (dipanggil manual dari menu Order).
     * Sengaja SINKRON (bukan dispatch job) supaya sales langsung lihat hasilnya -
     * ini aksi satu klik, bukan batch, jadi tidak perlu antrian/pacing.
     * Render ulang dari TemplateFollup (bukan parse teks lama di keterangan),
     * supaya kalau data order berubah sejak percobaan pertama, isi pesan ikut update.
     */
    public function resend($id)
    {
        $log = LogsFollup::with(['order_rel.customer_rel', 'order_rel.produk_rel', 'customer_rel'])->find($id);

        if (!$log) {
            return response()->json([
                'success' => false,
                'message' => 'Log follow-up tidak ditemukan',
            ], 404);
        }

        if ($log->status === '1') {
            return response()->json([
                'success' => false,
                'message' => 'Follow-up ini sudah berhasil terkirim, tidak perlu dikirim ulang',
            ], 422);
        }

        if (!$log->follup) {
            return response()->json([
                'success' => false,
                'message' => 'Template follow-up untuk log ini tidak diketahui, tidak bisa dikirim ulang otomatis',
            ], 422);
        }

        $template = TemplateFollup::find($log->follup);
        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template follow-up sudah tidak ada / terhapus',
            ], 422);
        }

        $customer = $log->order_rel->customer_rel ?? $log->customer_rel;
        if (!$customer || !$customer->wa) {
            return response()->json([
                'success' => false,
                'message' => 'Customer atau nomor WhatsApp tidak ditemukan',
            ], 422);
        }

        $order = $log->order_rel;

        $customData = [];
        if ($order && $order->custom_value) {
            $customData = json_decode($order->custom_value, true) ?? [];
            if (!is_array($customData)) {
                $customData = [];
            }
        }

        $data = array_merge([
            'customer_name' => $customer->nama ?? '',
            'product_name'  => $order?->produk_rel?->nama ?? '',
            'order_date'    => $order?->create_at ? Carbon::parse($order->create_at)->format('d-m-Y') : '',
            'order_total'   => $order?->total_harga ? number_format((float) $order->total_harga, 0, ',', '.') : '0',
        ], $customData);

        $message = TemplateHelper::render($template->text, $data);
        $woowaKey = $this->getWoowaKeyFromSales($customer, $order->produk ?? null);
        $salesId = $order->sales_id ?? ($customer->sales_id ?? null);

        $waSender = app(WhatsAppSenderService::class);
        $response = $waSender->sendMessage($customer->wa, $message, $salesId, $woowaKey);

        $statusText = $response->successful() ? 'sukses' : 'gagal';
        $keterangan = "Kirim ulang (resend) WA follow up type {$log->type} ke {$customer->wa} ({$customer->nama}). Status: {$statusText}. Pesan: {$message}";

        try {
            $responseData = $response->json();
            $responseText = is_array($responseData) ? json_encode($responseData) : (string) $response->body();
        } catch (\Throwable $e) {
            $responseText = 'Tidak dapat membaca response';
        }
        $keterangan .= "\nResponse: {$responseText}";

        $log->update([
            'keterangan' => $keterangan,
            'status' => $response->successful() ? '1' : '0',
            'update_at' => now(),
        ]);

        try {
            Log::channel('followup')->info('Resend manual follow-up', [
                'logs_follup_id' => $log->id,
                'customer_id' => $customer->id,
                'order_id' => $order->id ?? null,
                'template_id' => $template->id,
                'berhasil' => $response->successful(),
            ]);
        } catch (\Throwable $e) {
            // logging tidak boleh menggagalkan hasil resend yang sudah terjadi
        }

        return response()->json([
            'success' => $response->successful(),
            'message' => $response->successful()
                ? 'Follow-up berhasil dikirim ulang'
                : 'Gagal mengirim ulang follow-up, coba lagi nanti',
            'data' => $log->fresh(),
        ]);
    }

    /**
     * Ambil woowa_key dari sales berdasarkan produk atau customer.
     * Sama seperti helper di BroadcastController/SendFollowupCron.
     */
    private function getWoowaKeyFromSales($customer, $produkId = null)
    {
        if ($produkId) {
            $produk = \App\Models\Produk::find($produkId);
            if ($produk) {
                $assignArray = $produk->assign;
                if (is_string($assignArray)) {
                    $assignArray = json_decode($assignArray, true);
                }
                if (is_array($assignArray) && !empty($assignArray)) {
                    if ($customer && $customer->sales_id && in_array((int) $customer->sales_id, $assignArray)) {
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

        return env('WOOWA_KEY');
    }
}

