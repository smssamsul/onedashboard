<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Menu;
use App\Models\MenuAkses;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MenuAksesController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'departemen_id' => 'required|exists:hr_departemen,id',
            'jabatan_id' => 'required|exists:jabatan,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $grantedMenuIds = MenuAkses::where('departemen_id', $request->departemen_id)
            ->where('jabatan_id', $request->jabatan_id)
            ->pluck('menu_id')
            ->all();

        $menu = Menu::where('status', '!=', 'N')
            ->orderBy('section')
            ->orderBy('urutan')
            ->get()
            ->map(function ($item) use ($grantedMenuIds) {
                $item->granted = in_array($item->id, $grantedMenuIds);
                return $item;
            });

        return response()->json([
            'success' => true,
            'data' => $menu
        ], 200);
    }

    public function save(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'departemen_id' => 'required|exists:hr_departemen,id',
            'jabatan_id' => 'required|exists:jabatan,id',
            'menu_ids' => 'present|array',
            'menu_ids.*' => 'integer|exists:menu,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        DB::transaction(function () use ($request) {
            MenuAkses::where('departemen_id', $request->departemen_id)
                ->where('jabatan_id', $request->jabatan_id)
                ->delete();

            $rows = collect($request->menu_ids)->unique()->map(function ($menuId) use ($request) {
                return [
                    'departemen_id' => $request->departemen_id,
                    'jabatan_id' => $request->jabatan_id,
                    'menu_id' => $menuId,
                    'create_at' => now()->format('Y-m-d H:i:s'),
                ];
            })->all();

            if (!empty($rows)) {
                MenuAkses::insert($rows);
            }
        });

        return response()->json([
            'success' => true,
            'message' => 'Hak akses menu berhasil disimpan'
        ], 200);
    }
}
