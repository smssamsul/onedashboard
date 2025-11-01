<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\UserLogin;
use Illuminate\Support\Facades\Validator;

class UserController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $users = User::all();
        return response()->json([
            'success' => true,
            'data' => $users
        ], 200);
    }

    public function show($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $user
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string',
            'email' => 'required|email|unique:user,email',
            'tanggal_lahir' => 'required|date',
            'tanggal_join' => 'required|date',
            'no_telp' => 'required',
            'alamat' => 'required|string',
            'divisi' => 'required|integer',
            'level' => 'required|string',
            // 'status' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

        $user = User::create([
            'nama'      => $request->nama,
            'email'     => $request->email,
            'tanggal_lahir'     => $request->tanggal_lahir,
            'tanggal_join'     => $request->tanggal_join,
            'alamat'     => $request->alamat,
            'divisi'     => $request->divisi,
            'level'     => $request->level,       
            'no_telp'     => $request->no_telp,            
            'create_at'     => now(),
            'status'    => '1'

        ]);
        
        $userLogin = UserLogin::create([
            'user'      => $user->id,
            'email'     => $request->email,
            'password'  => bcrypt("123456"),
            'status'    => '1'

        ]);
        // $user = User::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dibuat',
            'data' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 404);
        }
        
        $user->update([
            'nama'          => $request->nama,
            'email'         => $request->email,
            'tanggal_lahir' => $request->tanggal_lahir,
            'tanggal_join'  => $request->tanggal_join,
            'alamat'        => $request->alamat,
            'divisi'        => $request->divisi,
            'level'         => $request->level,       
            'no_telp'       => $request->no_telp,            
            'update_at'     => now(),

        ]);
        // $user->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'User berhasil diperbarui',
            'data' => $user
        ], 200);
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 404);
        }

        
        $user->update([
            'status'    => "2"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User berhasil dihapus'
        ], 200);
    }
}