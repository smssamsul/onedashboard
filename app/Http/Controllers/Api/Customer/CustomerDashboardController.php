<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Models\Customer;
use App\Models\Webinar;

class CustomerDashboardController extends Controller
{
    public function index(Request $request)
    {
        $customer = auth('customer')->user();

        // Check jika customer belum diverifikasi (verifikasi = 0)
        if ($customer->verifikasi == 0 || $customer->verifikasi === '0' || $customer->verifikasi === null) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum diverifikasi. Silakan verifikasi OTP terlebih dahulu.',
                'redirect' => '/customer/verify-otp',
                'verifikasi' => false
            ], 403);
        }

        // Ambil order aktif (yang sudah dibayar - status_pembayaran = '1')
        $ordersAktif = OrderCustomer::with([
            'produk_rel' => function($query) {
                $query->with(['kategori_rel', 'webinar']);
            }
        ])
        ->where('customer', $customer->id)
        ->where('status_order', '2') // Order yang sudah dibayar
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

            $orderData = [
                'id' => $order->id,
                'produk' => $produk->id ?? null,
                'produk_nama' => $produk->nama ?? null,
                'produk_kode' => $produk->kode ?? null,
                'kategori_nama' => $kategori->nama ?? null,
                'tipe_produk' => $tipeProduk,
                'gambar' => $gambarProduk,
                'total_harga' => $order->total_harga,
                'total_harga_formatted' => 'Rp ' . number_format($order->total_harga, 0, ',', '.'),
                'tanggal_order' => $order->create_at ? $order->create_at->format('d/m/Y H:i') : null,
                'tanggal_order_raw' => $order->create_at,
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
                ],
                'statistik' => [
                    'total_order' => $totalOrder,
                    'order_aktif' => $totalAktif,
                ],
                'orders_aktif' => $ordersAktifFormatted
            ]
        ]);
    }

    public function store(Request $request)
    {

        $idCustomer = auth('customer')->user();
        $validator = Validator::make($request->all(), [
            // 'nama' => 'required|string|max:255',
            // 'email' => 'required|email|unique:customer,email',
            'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $customer = Customer::findOrFail($idCustomer->id);

        $customer->update([
            'nama_panggilan' => $request->nama_panggilan,
            'instagram' => $request->instagram,
            'profesi' => $request->profesi,
            'pendapatan_bln' => $request->pendapatan_bln,
            'industri_pekerjaan' => $request->industri_pekerjaan,
            'jenis_kelamin' => $request->jenis_kelamin,
            'tanggal_lahir' => $request->tanggal_lahir,
            'password' => bcrypt($request->password),
            'alamat' => $request->alamat,
            'update_at' => now(),
        ]);

        if ($request->filled('password')) {
            $customer->update([
                'password' => Hash::make($request->password),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil ditambahkan',
            'data' => $customer
        ], 201);
    }
}
