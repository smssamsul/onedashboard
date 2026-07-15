<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Models\Customer;
use App\Models\Webinar;

class CustomerDashboardController extends Controller
{
    public function index(Request $request)
    {
        $customer = Customer::find(auth('customer')->user()->id);

        // Check jika customer belum diverifikasi (verifikasi = 0)
        // if ($customer->verifikasi == 0 || $customer->verifikasi === '0' || $customer->verifikasi === null) {
        //     return response()->json([
        //         'success' => false,
        //         'message' => 'Akun Anda belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.',
        //         'redirect' => '/customer/verify-otp',
        //         'verifikasi' => false
        //     ], 403);
        // }

        // Ambil order aktif (yang sudah dibayar - status_pembayaran = '1')
        $ordersAktif = OrderCustomer::with([
            'produk_rel' => function($query) {
                $query->with(['kategori_rel', 'webinar']);
            }
        ])
        ->where('customer', $customer->id)
        // ->where('status_order', '2') 
        ->where('status', '!=', 'N') // Status tidak nonaktif
        ->orderBy('create_at', 'desc')
        ->get();

        // Format data order aktif
        $ordersAktifFormatted = $ordersAktif->map(function($order) {
            $produk = $order->produk_rel;
            $webinar = $produk->webinar ?? null;
            $kategori = $produk->kategori_rel ?? null;
            
            // Tentukan tipe produk (ebook atau seminar)
            $isSeminar = $webinar !== null;
            $tipeProduk = $isSeminar ? 'seminar' : 'ebook';
            
            // Format gambar produk
            $gambarProduk = [];
            if ($produk && $produk->gambar) {
                $gambar = is_array($produk->gambar) ? $produk->gambar : json_decode($produk->gambar, true);
                if (is_array($gambar)) {
                    foreach ($gambar as $img) {
                        if (isset($img['file'])) {
                            $gambarProduk[] = asset('upload/produk/' . $img['file']);
                        }
                    }
                }
            }
            
            // Jika tidak ada gambar dari array, coba ambil gambar header
            if (empty($gambarProduk) && $produk && $produk->header) {
                // Asumsikan header adalah nama file, jika tidak ada path penuh
                if (!filter_var($produk->header, FILTER_VALIDATE_URL)) {
                    $gambarProduk[] = asset('upload/produk/' . $produk->header);
                } else {
                    $gambarProduk[] = $produk->header;
                }
            }

            // Ambil post_rel dari produk (otomatis dari accessor)
            $postRel = [];
            if ($produk && isset($produk->post_rel)) {
                $postRel = $produk->post_rel;
            }

            $orderData = [
                'id' => $order->id,
                'produk' => $produk->id ?? null,
                'produk_nama' => $produk->nama ?? null,
                'produk_kode' => $produk->kode ?? null,
                'kategori_nama' => $kategori->nama ?? null,
                'tipe_produk' => $tipeProduk,
                'gambar' => $gambarProduk,
                'post_rel' => $postRel,
                'total_harga' => $order->total_harga,
                'total_harga_formatted' => 'Rp ' . number_format($order->total_harga, 0, ',', '.'),
                'tanggal_order' => $order->create_at ? $order->create_at->format('d/m/Y H:i') : null,
                'tanggal_order_raw' => $order->create_at,
                'status_pembayaran' => $order->status_pembayaran,
                'status_order' => $order->status_order,
                'metode_bayar' => $order->metode_bayar,
            ];

            // Jika seminar, tambahkan info webinar
            if ($isSeminar && $webinar) {
                $orderData['webinar'] = [
                    'meeting_id' => $webinar->meeting_id,
                    'join_url' => $webinar->join_url,
                    'start_url' => $webinar->start_url,
                    'start_time' => $webinar->start_time ? $webinar->start_time : null,
                    'start_time_formatted' => $webinar->start_time ? date('d/m/Y H:i', strtotime($webinar->start_time)) : null,
                    'duration' => $webinar->duration,
                    'password' => $webinar->password,
                ];
            }

            // Jika ebook, tambahkan link ebook
            if (!$isSeminar && $produk && $produk->url) {
                $orderData['ebook_url'] = $produk->url;
            }

            return $orderData;
        });

        // Statistik order
        $allOrders = OrderCustomer::where('customer', $customer->id)->get();
        $totalOrder = $allOrders->count();
        $totalAktif = $ordersAktif->count();

        $keanggotaan = 'basic'; // Default
        if (isset($customer->keanggotaan) && !empty($customer->keanggotaan)) {
            $keanggotaan = $customer->keanggotaan;
        }
        
        // Validasi keanggotaan
        if (!in_array($keanggotaan, ['basic', 'bronze', 'silver', 'gold', 'platinum', 'diamond'])) {
            $keanggotaan = 'basic';
        }

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'nama' => $customer->nama,
                    'nama_panggilan' => $customer->nama_panggilan ?? $customer->nama,
                    'email' => $customer->email,
                    'wa' => $customer->wa,
                    'status' => $customer->status,
                    'memberID' => $customer->memberID,
                    'keanggotaan' => $keanggotaan,
                ],
                'statistik' => [
                    'total_order' => $totalOrder,
                    'order_aktif' => $totalAktif,
                ],
                'orders_aktif' => $ordersAktifFormatted
            ]
        ]);
    }

    /**
     * Get detail customer
     */
    public function show(Request $request)
    {
        $customer = Customer::with('sales_rel:id,nama')
            ->find(auth('customer')->user()->id);

        if (!$customer) {
            return response()->json([
                'success' => false,
                'message' => 'Customer tidak ditemukan'
            ], 404);
        }

     

        // Statistik order
        $allOrders = OrderCustomer::where('customer', $customer->id)->get();
        $totalOrder = $allOrders->count();
        $ordersAktif = OrderCustomer::where('customer', $customer->id)
            ->where('status', '!=', 'N')
            ->count();
        $ordersMenungguValidasi = OrderCustomer::where('customer', $customer->id)
            ->where('status_pembayaran', '1')
            ->where('status', '!=', 'N')
            ->count();
        $ordersSudahDiapprove = OrderCustomer::where('customer', $customer->id)
            ->where('status_pembayaran', '2')
            ->where('status', '!=', 'N')
            ->count();
        $ordersDitolak = OrderCustomer::where('customer', $customer->id)
            ->where('status_pembayaran', '3')
            ->where('status', '!=', 'N')
            ->count();

        // Total pembayaran yang sudah diapprove
        // Cast total_harga ke numeric untuk PostgreSQL
        $totalPembayaran = OrderCustomer::where('customer', $customer->id)
            ->where('status_pembayaran', '2')
            ->where('status', '!=', 'N')
            ->selectRaw('SUM(CAST(total_harga AS numeric)) as total')
            ->value('total') ?? 0;

        // Format tanggal
        $tanggalLahirFormatted = null;
        if ($customer->tanggal_lahir) {
            try {
                $tanggalLahirFormatted = \Carbon\Carbon::parse($customer->tanggal_lahir)->format('d/m/Y');
            } catch (\Exception $e) {
                $tanggalLahirFormatted = $customer->tanggal_lahir;
            }
        }

        $createAtFormatted = null;
        if ($customer->create_at) {
            try {
                $createAtFormatted = \Carbon\Carbon::parse($customer->create_at)->format('d/m/Y H:i');
            } catch (\Exception $e) {
                $createAtFormatted = $customer->create_at;
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail customer berhasil diambil',
            'data' => [
                'id' => $customer->id,
                'nama' => $customer->nama,
                'nama_panggilan' => $customer->nama_panggilan ?? $customer->nama,
                'email' => $customer->email,
                'wa' => $customer->wa,
                'instagram' => $customer->instagram,
                'profesi' => $customer->profesi,
                'pendapatan_bln' => $customer->pendapatan_bln,
                'industri_pekerjaan' => $customer->industri_pekerjaan,
                'jenis_kelamin' => $customer->jenis_kelamin,
                'tanggal_lahir' => $customer->tanggal_lahir,
                'tanggal_lahir_formatted' => $tanggalLahirFormatted,
                'alamat' => $customer->alamat,
                'provinsi' => $customer->provinsi,
                'kabupaten' => $customer->kabupaten,
                'kecamatan' => $customer->kecamatan,
                'kode_pos' => $customer->kode_pos,
                'sapaan' => $customer->sapaan,
                'status' => $customer->status,
                'verifikasi' => $customer->verifikasi,
                'memberID' => $customer->memberID,
                'keanggotaan' => $customer->keanggotaan,
                'create_at' => $customer->create_at,
                'create_at_formatted' => $createAtFormatted,
                'update_at' => $customer->update_at,
                'sales' => $customer->sales_rel ? [
                    'id' => $customer->sales_rel->id,
                    'nama' => $customer->sales_rel->nama,
                ] : null,
                'statistik' => [
                    'total_order' => $totalOrder,
                    'order_aktif' => $ordersAktif,
                    'order_menunggu_validasi' => $ordersMenungguValidasi,
                    'order_sudah_diapprove' => $ordersSudahDiapprove,
                    'order_ditolak' => $ordersDitolak,
                    'total_pembayaran' => (float) $totalPembayaran,
                    'total_pembayaran_formatted' => 'Rp ' . number_format($totalPembayaran, 0, ',', '.'),
                ],
            ]
        ], 200);
    }

    public function store(Request $request)
    {
        $idCustomer = auth('customer')->user();
        
        $customer = Customer::findOrFail($idCustomer->id);

        // Daftar field yang diizinkan untuk diupdate
        $allowedFields = [
            'nama_panggilan',
            'instagram',
            'profesi',
            'pendapatan_bln',
            'industri_pekerjaan',
            'jenis_kelamin',
            'tanggal_lahir',
            'alamat',
            'wa',
            'wa2',
            'provinsi',
            'kabupaten',
            'kecamatan',
            'kode_pos',
            'sapaan',
        ];

        $updateData = [];

        // Loop melalui field yang diizinkan
        // Hanya tambahkan ke updateData jika field tersebut ada di request
        foreach ($allowedFields as $field) {
            if ($request->has($field)) {
                $updateData[$field] = $request->input($field);
            }
        }

        // Update password hanya jika diisi
        if ($request->filled('password')) {
            $updateData['password'] = Hash::make($request->password);
        }

        // Format phone numbers jika ada
        if (isset($updateData['wa']) && $updateData['wa']) {
            $updateData['wa'] = $this->formatPhoneNumber($updateData['wa']);
        }
        if (isset($updateData['wa2']) && $updateData['wa2']) {
            $updateData['wa2'] = $this->formatPhoneNumber($updateData['wa2']);
        }

        // Jika ada data yang akan diupdate, tambahkan update_at
        if (!empty($updateData)) {
            $updateData['update_at'] = now();
            $customer->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profile berhasil diperbarui',
            'data' => $customer->fresh()
        ], 200);
    }

    private function formatPhoneNumber($phone)
    {
        $phone = preg_replace('/[^0-9]/', '', $phone);

        if (substr($phone, 0, 1) === '0') {
            $phone = '62' . substr($phone, 1);
        }

        if (substr($phone, 0, 2) !== '62') {
            $phone = '62' . ltrim($phone, '0');
        }

        return $phone;
    }
}
