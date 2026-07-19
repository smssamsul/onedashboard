<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MetaAdsAccount;
use Illuminate\Support\Facades\Validator;

class MetaAdsAccountController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $accounts = MetaAdsAccount::orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    public function show($id)
    {
        $account = MetaAdsAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Meta Ads tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $account,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string',
            'ad_account_id' => 'nullable|string',
            'access_token' => 'nullable|string',
            'app_id' => 'nullable|string',
            'app_secret' => 'nullable|string',
            'business_id' => 'nullable|string',
            'currency' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $account = MetaAdsAccount::create([
            'nama' => $request->nama,
            'ad_account_id' => $request->ad_account_id,
            'access_token' => $request->access_token,
            'app_id' => $request->app_id,
            'app_secret' => $request->app_secret,
            'business_id' => $request->business_id,
            'currency' => $request->currency,
            'is_active' => $request->boolean('is_active', true),
            'create_at' => now(),
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Akun Meta Ads berhasil ditambahkan',
            'data' => $account,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $account = MetaAdsAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Meta Ads tidak ditemukan',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'required|string',
            'ad_account_id' => 'nullable|string',
            'access_token' => 'nullable|string',
            'app_id' => 'nullable|string',
            'app_secret' => 'nullable|string',
            'business_id' => 'nullable|string',
            'currency' => 'nullable|string',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors(),
            ], 422);
        }

        $account->nama = $request->nama;
        $account->ad_account_id = $request->ad_account_id;
        // Token cuma diupdate kalau dikirim ulang (biar gak ketimpa kosong pas edit field lain)
        if ($request->filled('access_token')) {
            $account->access_token = $request->access_token;
        }
        if ($request->filled('app_secret')) {
            $account->app_secret = $request->app_secret;
        }
        $account->app_id = $request->app_id;
        $account->business_id = $request->business_id;
        $account->currency = $request->currency;
        $account->is_active = $request->boolean('is_active', $account->is_active);
        $account->update_at = now();
        $account->save();

        return response()->json([
            'success' => true,
            'message' => 'Akun Meta Ads berhasil diupdate',
            'data' => $account,
        ]);
    }

    public function destroy($id)
    {
        $account = MetaAdsAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Meta Ads tidak ditemukan',
            ], 404);
        }

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Akun Meta Ads berhasil dihapus',
        ]);
    }
}
