<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;
use App\Models\OrderCustomer;

class CustomerController extends Controller
{
      public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
         $customers = Customer::select(array_diff(
                    \Schema::getColumnListing('customer'),
                    ['password','create_at','update_at'] 
                ))
                ->where('status', '!=', 'N')
                ->orderBy('id', 'desc')
                ->get();

        return response()->json([
            'success' => true,
            'data' => $customers
        ]);
    }

    public function form_customer_update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'nama_panggilan' => 'required|string|max:255',
            'instagram' => 'required',
            'profesi' => 'required',
            'pendapatan_bln' => 'required',
            'industri_pekerjaan' => 'required',
            'jenis_kelamin' => 'required',
            'tanggal_lahir' => 'required',

            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $customer = Customer::find($id);
        $customer->fill($validator->validated());
        $customer->update_at = now();
        $customer->save();

 
        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'id' => $customer->id
        ], 201);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'email' => 'required|email|unique:customer,email',
            // 'password' => 'required|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $wa = $this->formatPhoneNumber($request->wa);

        $customer = Customer::create([
            'nama' => $request->nama,
            'nama_panggilan' => $request->nama_panggilan,
            'email' => $request->email,
            'instagram' => $request->instagram,
            'password' => bcrypt("123456"),
            // 'password' => Hash::make($request->password),
            'wa' => $wa,
            'profesi' => $request->profesi,
            'pendapatan_bln' => $request->pendapatan_bln,
            'industri_pekerjaan' => $request->industri_pekerjaan,
            'jenis_kelamin' => $request->jenis_kelamin,
            'tanggal_lahir' => $request->tanggal_lahir,
            'alamat' => $request->alamat,
            // 'status_order' => $request->status_order,
            // 'verifikasi' => $request->verifikasi,
            // 'alasan_tertarik' => $request->alasan_tertarik,
            // 'alasan_belum' => $request->alasan_belum,
            // 'harapan' => $request->harapan,
            'create_at' => now(),
            'status' => '1'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil ditambahkan',
            'data' => $customer
        ], 201);
    }
 

    public function show($id)
    {

        $customers = Customer::select(array_diff(
                    \Schema::getColumnListing('customer'),
                    ['password','create_at','update_at'] 
                ))
                ->where('id', $id)
                ->where('status', '!=', 'N')
                ->orderBy('id', 'desc')
                ->get();
        

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $customer
        ]);
    }


    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        $customer->update($request->all());
        $customer->update_at = now();
        $customer->save();

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil diupdate',
            'data' => $customer
        ]);
    }



    public function destroy($id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Customer tidak ditemukan'], 404);
        }

        $customer->update([
            'status'    => "N"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dihapus'
        ]);
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

    public function riwayat_order(Request $request, $id)
    {
        
        $riwayat_order = OrderCustomer::with([
            'produk_rel:id,nama',
            'customer_rel:id,nama,wa'])
            ->where('customer', $id)
            ->orderBy('create_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Riwayat order berhasil diambil',
            'data' => $riwayat_order
        ]);
    }
}

