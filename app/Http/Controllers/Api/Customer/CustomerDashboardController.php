<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\OrderCustomer;
use App\Models\Produk;
use App\Models\Customer;

class CustomerDashboardController extends Controller
{
    public function index(Request $request)
    {
        $customer = auth('customer')->user();

        $orders = OrderCustomer::with('produk_rel')
                    ->where('customer', $customer->id)
                    ->orderBy('create_at', 'desc')
                    ->get();

        $totalOrder = $orders->count();
        $totalSelesai = $orders->where('status', '1')->count();
        $totalProses = $orders->where('status', '2')->count();
        $lastOrder = $orders->first();

        return response()->json([
            'success' => true,
            'data' => [
                'customer' => [
                    'id' => $customer->id,
                    'nama' => $customer->nama,
                    'email' => $customer->email,
                    'wa' => $customer->wa,
                    'status' => $customer->status,
                ],
                'statistik' => [
                    'total_order' => $totalOrder,
                    'order_selesai' => $totalSelesai,
                    'order_proses' => $totalProses,
                ],
                'order_terakhir' => $lastOrder ? [
                    'produk' => $lastOrder->produk_rel->nama ?? null,
                    'tanggal' => $lastOrder->create_at,
                    'status' => $lastOrder->status,
                    'total' => number_format($lastOrder->total_harga, 0, ',', '.')
                ] : null
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
