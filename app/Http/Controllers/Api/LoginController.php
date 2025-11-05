<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Validator;
use App\Models\UserLogin;

class LoginController extends Controller
{
    /**
     * Handle the incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function __invoke(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'     => 'required',
            'password'  => 'required'
        ]);

        if ($validator->fails()) {
            return response()->json($validator->errors(), 422);
        }

       
        $credentials = $request->only('email', 'password');

        $user = UserLogin::where('email', $credentials['email'])->first();
        if ($user->status == 'N') {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum aktif atau telah dinonaktifkan'
            ], 403);
        }

        if(!$token = auth()->guard('api')->attempt($credentials)) {
            return response()->json([
                'success' => false,
                'message' => 'Email atau Password Anda salah',
                'request' => $request->all()
            ], 401);
        }

        $userLogin = auth()->guard('api')->user();
        
        UserLogin::where('id', $userLogin->id)
                ->update([
                    'token' => $token,
                    'updated_at' => now(),
                ]);

         $userLogin->load('userData');
       
        
        return response()->json([
            'success' => true,
            'user'    => [
                            'id'       => $userLogin->id,
                            'email'    => $userLogin->email,
                            'name'     => $userLogin->userData->nama ?? null,
                            'divisi'   => $userLogin->userData->divisi ?? null,
                            'level'    => $userLogin->userData->level ?? null,
                        ],    
            'token'   => $token
        ], 200);
    }
}
