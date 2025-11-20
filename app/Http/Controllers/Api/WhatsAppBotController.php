<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\OrderCustomer;
use App\Models\Produk;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

class WhatsAppBotController extends Controller
{
    /**
     * Webhook untuk menerima pesan dari WhatsApp (via n8n)
     */
    public function webhook(Request $request)
    {
        // Validasi request
        $request->validate([
            'phone' => 'required|string',
            'message' => 'required|string',
            'message_id' => 'nullable|string',
        ]);

        $phone = $this->formatPhoneNumber($request->phone);
        $message = trim($request->message);
        $messageId = $request->message_id;

        // Cari customer berdasarkan nomor WA
        $customer = Customer::where('wa', $phone)->first();

        // Deteksi apakah pesan perlu di-handle CS (nego, diskon, dll)
        $requiresCS = $this->requiresCustomerService($message);

        if ($requiresCS) {
            // Simpan ke queue untuk CS
            $this->queueForCustomerService($phone, $message, $customer);
            
            return response()->json([
                'success' => true,
                'handled_by' => 'cs',
                'message' => 'Pesan Anda telah diteruskan ke Customer Service. Tim kami akan segera menghubungi Anda.',
                'auto_reply' => $this->getCSAutoReply()
            ]);
        }

        // Proses dengan AI/Bot
        $response = $this->processBotQuery($message, $customer);

        return response()->json([
            'success' => true,
            'handled_by' => 'bot',
            'response' => $response['message'],
            'data' => $response['data'] ?? null
        ]);
    }

    /**
     * Deteksi apakah pesan perlu di-handle Customer Service
     */
    private function requiresCustomerService($message)
    {
        $message = strtolower($message);
        
        // Kata kunci yang harus di-handle CS
        $csKeywords = [
            'nego', 'negoisasi', 'nego harga', 'bisa kurang', 'bisa diskon',
            'harga lebih murah', 'tawar', 'tawaran', 'special price',
            'complaint', 'komplain', 'masalah', 'error', 'bug',
            'refund', 'pengembalian', 'cancel', 'batal',
            'cs', 'customer service', 'admin', 'bantuan manusia'
        ];

        foreach ($csKeywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }

        return false;
    }

    /**
     * Proses query dengan bot/AI
     */
    private function processBotQuery($message, $customer = null)
    {
        $message = strtolower(trim($message));
        
        // Deteksi intent
        if ($this->isGreeting($message)) {
            return $this->handleGreeting($customer);
        }
        
        if ($this->isHelpQuery($message)) {
            return $this->handleHelp();
        }
        
        if ($this->isOrderStatusQuery($message)) {
            return $this->handleOrderStatus($customer);
        }
        
        if ($this->isProductQuery($message)) {
            return $this->handleProductQuery($message);
        }
        
        if ($this->isPaymentQuery($message)) {
            return $this->handlePaymentQuery($customer);
        }
        
        // Default response
        return [
            'message' => "Maaf, saya belum memahami pertanyaan Anda. Ketik *HELP* untuk melihat menu bantuan.\n\nUntuk pertanyaan tentang harga, diskon, atau negoisasi, silakan hubungi Customer Service kami. Ketik *CS* untuk terhubung dengan tim kami.",
            'data' => null
        ];
    }

    /**
     * Handle greeting
     */
    private function handleGreeting($customer)
    {
        $name = $customer ? ($customer->nama_panggilan ?? $customer->nama ?? 'Kak') : 'Kak';
        
        $message = "Halo {$name}! 👋\n\n";
        $message .= "Saya adalah asisten virtual One Dashboard. Saya bisa membantu Anda dengan:\n";
        $message .= "• Cek status order\n";
        $message .= "• Info produk\n";
        $message .= "• Info pembayaran\n\n";
        $message .= "Ketik *HELP* untuk melihat menu lengkap.\n";
        $message .= "Untuk nego harga atau pertanyaan khusus, ketik *CS* untuk terhubung dengan Customer Service.";

        return ['message' => $message];
    }

    /**
     * Handle help query
     */
    private function handleHelp()
    {
        $message = "📋 *Menu Bantuan*\n\n";
        $message .= "Ketik perintah berikut untuk mendapatkan informasi:\n\n";
        $message .= "• *ORDER* - Cek status order Anda\n";
        $message .= "• *PRODUK* - Lihat daftar produk\n";
        $message .= "• *BAYAR* - Info pembayaran tertunda\n";
        $message .= "• *CS* - Hubungi Customer Service\n\n";
        $message .= "Contoh: Ketik 'ORDER' untuk melihat order aktif Anda.";

        return ['message' => $message];
    }

    /**
     * Handle order status query
     */
    private function handleOrderStatus($customer)
    {
        if (!$customer) {
            return [
                'message' => "Maaf, nomor WhatsApp Anda belum terdaftar. Silakan daftar terlebih dahulu atau hubungi Customer Service."
            ];
        }

        $orders = OrderCustomer::with(['produk_rel'])
            ->where('customer', $customer->id)
            ->where('status_order', '2') // Order yang sudah dibayar
            ->where('status', '!=', 'N')
            ->orderBy('create_at', 'desc')
            ->limit(5)
            ->get();

        if ($orders->isEmpty()) {
            return [
                'message' => "Anda belum memiliki order aktif. Silakan kunjungi website kami untuk melihat produk yang tersedia."
            ];
        }

        $message = "📦 *Order Aktif Anda:*\n\n";
        foreach ($orders as $order) {
            $produk = $order->produk_rel;
            $message .= "• *{$produk->nama}*\n";
            $message .= "  Total: Rp " . number_format($order->total_harga, 0, ',', '.') . "\n";
            $message .= "  Tanggal: " . $order->create_at->format('d/m/Y') . "\n";
            $message .= "  Status: " . $this->getOrderStatusText($order->status_order) . "\n\n";
        }

        return ['message' => $message, 'data' => $orders];
    }

    /**
     * Handle product query
     */
    private function handleProductQuery($message)
    {
        // Extract product name/keyword from message
        $keywords = $this->extractKeywords($message);
        
        $query = Produk::where('status', '1');
        
        if (!empty($keywords)) {
            $query->where(function($q) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $q->orWhere('nama', 'like', "%{$keyword}%")
                      ->orWhere('kode', 'like', "%{$keyword}%");
                }
            });
        }
        
        $products = $query->limit(5)->get();
        
        if ($products->isEmpty()) {
            return [
                'message' => "Produk tidak ditemukan. Silakan kunjungi website kami untuk melihat katalog lengkap.\n\nUntuk info harga atau nego, ketik *CS* untuk terhubung dengan Customer Service."
            ];
        }
        
        $message = "📋 *Produk yang Ditemukan:*\n\n";
        foreach ($products as $product) {
            $message .= "• *{$product->nama}*\n";
            $message .= "  Kode: {$product->kode}\n";
            $harga = $product->harga_asli ?? 0;
            if ($product->harga_coret && $product->harga_coret > $harga) {
                $message .= "  Harga: ~~Rp " . number_format($product->harga_coret, 0, ',', '.') . "~~\n";
                $message .= "  Harga: Rp " . number_format($harga, 0, ',', '.') . "\n";
            } else {
                $message .= "  Harga: Rp " . number_format($harga, 0, ',', '.') . "\n";
            }
            $message .= "\n";
        }
        
        $message .= "Untuk info lebih detail atau nego harga, ketik *CS* untuk terhubung dengan Customer Service.";
        
        return [
            'message' => $message,
            'data' => [
                'products' => $products,
                'keywords' => $keywords
            ]
        ];
    }

    /**
     * Handle payment query
     */
    private function handlePaymentQuery($customer)
    {
        if (!$customer) {
            return [
                'message' => "Maaf, nomor WhatsApp Anda belum terdaftar."
            ];
        }

        $unpaidOrders = OrderCustomer::with(['produk_rel'])
            ->where('customer', $customer->id)
            ->where(function($query) {
                $query->whereNull('status_order')
                      ->orWhere('status_order', '!=', '2');
            })
            ->orderBy('create_at', 'desc')
            ->limit(3)
            ->get();

        if ($unpaidOrders->isEmpty()) {
            return [
                'message' => "Tidak ada pembayaran yang tertunda. Semua order Anda sudah dibayar. ✅"
            ];
        }

        $message = "💳 *Pembayaran Tertunda:*\n\n";
        foreach ($unpaidOrders as $order) {
            $produk = $order->produk_rel;
            $message .= "• *{$produk->nama}*\n";
            $message .= "  Total: Rp " . number_format($order->total_harga, 0, ',', '.') . "\n";
            $message .= "  Status: Belum Dibayar\n";
            $message .= "  Tanggal Order: " . $order->create_at->format('d/m/Y') . "\n\n";
        }
        
        $message .= "Silakan lakukan pembayaran untuk melanjutkan proses order Anda.";

        return ['message' => $message, 'data' => $unpaidOrders];
    }

    /**
     * Helper methods
     */
    private function isGreeting($message)
    {
        $greetings = ['halo', 'hai', 'hi', 'hello', 'selamat', 'pagi', 'siang', 'sore', 'malam'];
        foreach ($greetings as $greeting) {
            if (strpos($message, $greeting) !== false) {
                return true;
            }
        }
        return false;
    }

    private function isHelpQuery($message)
    {
        $keywords = ['help', 'bantuan', 'menu', 'perintah', 'command'];
        foreach ($keywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    private function isOrderStatusQuery($message)
    {
        $keywords = ['order', 'pesanan', 'status order', 'cek order', 'riwayat', 'order saya'];
        foreach ($keywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    private function isProductQuery($message)
    {
        $keywords = ['produk', 'product', 'barang', 'katalog', 'list produk', 'daftar produk'];
        foreach ($keywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    private function isPaymentQuery($message)
    {
        $keywords = ['pembayaran', 'payment', 'bayar', 'tagihan', 'invoice', 'pembayaran saya'];
        foreach ($keywords as $keyword) {
            if (strpos($message, $keyword) !== false) {
                return true;
            }
        }
        return false;
    }

    private function extractKeywords($message)
    {
        // Simple keyword extraction
        $words = explode(' ', $message);
        $stopWords = [
            'saya', 'ingin', 'mau', 'cari', 'lihat', 'info', 'tentang', 'apa', 'yang', 'ada', 'dari',
            'produk', 'product', 'daftar', 'tersedia', 'semua', 'saja', 'tolong', 'dong', 'mohon',
            'list', 'katalog', 'apaaja', 'apaaja?', 'apa?', 'aja', 'aja?', 'aja.', 'ajaa', 'ajaa?'
        ];

        return array_values(array_filter($words, function ($word) use ($stopWords) {
            $word = trim(strtolower($word));
            return strlen($word) > 2 && !in_array($word, $stopWords);
        }));
    }

    private function getOrderStatusText($status)
    {
        $statuses = [
            '1' => 'Menunggu Pembayaran',
            '2' => 'Sudah Dibayar',
            '3' => 'Diproses',
            '4' => 'Selesai'
        ];
        return $statuses[$status] ?? 'Unknown';
    }

    private function getCSAutoReply()
    {
        return "Terima kasih telah menghubungi kami. Tim Customer Service akan segera merespons pertanyaan Anda. Mohon tunggu sebentar ya! 😊";
    }

    private function queueForCustomerService($phone, $message, $customer)
    {
        // Simpan ke database untuk di-handle CS
        try {
            DB::table('customer_service_queue')->insert([
                'phone' => $phone,
                'message' => $message,
                'customer_id' => $customer->id ?? null,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            // Log error jika tabel belum ada
            \Log::error('Failed to queue CS message: ' . $e->getMessage());
        }
    }

    private function formatPhoneNumber($phone)
    {
        // Format nomor WA: hapus karakter non-digit, pastikan format 62xxxxxxxxxx
        $phone = preg_replace('/[^0-9]/', '', $phone);
        if (substr($phone, 0, 1) == '0') {
            $phone = '62' . substr($phone, 1);
        } elseif (substr($phone, 0, 2) != '62') {
            $phone = '62' . $phone;
        }
        return $phone;
    }
}

