<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Hash;

class CustomerController extends Controller
{
      public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $customers = Customer::orderBy('id', 'desc')->get();
        return response()->json([
            'success' => true,
            'data' => $customers
        ]);
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

        $customer = Customer::create([
            'nama' => $request->nama,
            'nama_panggilan' => $request->nama_panggilan,
            'email' => $request->email,
            'instagram' => $request->instagram,
            // 'password' => Hash::make($request->password),
            'wa' => $request->wa,
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
            'id' => $customer->id
        ], 201);
    }
 

    public function show($id)
    {
        $customer = Customer::find($id);

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
            'status'    => "2"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Customer berhasil dihapus'
        ]);
    }
}