<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Menu;
use Illuminate\Support\Facades\Validator;

class MenuController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = Menu::where('status', '!=', 'N');

        if ($request->has('departemen_id') && $request->departemen_id) {
            $query->where(function ($q) use ($request) {
                $q->where('departemen_id', $request->departemen_id)
                  ->orWhereNull('departemen_id');
            });
        }

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where('label', 'ILIKE', "%{$search}%");
        }

        $menu = $query->orderBy('section')->orderBy('urutan')->get();

        return response()->json([
            'success' => true,
            'data' => $menu,
            'total' => $menu->count()
        ], 200);
    }

    public function show($id)
    {
        $menu = Menu::where('id', $id)->where('status', '!=', 'N')->first();

        if (!$menu) {
            return response()->json([
                'success' => false,
                'message' => 'Menu tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $menu
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'key' => 'required|string|max:100|unique:menu,key',
            'label' => 'required|string|max:150',
            'href' => 'nullable|string|max:255',
            'icon_name' => 'nullable|string|max:100',
            'section' => 'nullable|string|max:100',
            'departemen_id' => 'nullable|exists:hr_departemen,id',
            'urutan' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $menu = Menu::create([
            'key' => $request->key,
            'label' => $request->label,
            'href' => $request->href,
            'icon_name' => $request->icon_name,
            'section' => $request->section,
            'departemen_id' => $request->departemen_id,
            'urutan' => $request->urutan ?? 0,
            'status' => '1',
            'create_at' => now()->format('Y-m-d H:i:s'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil ditambahkan',
            'data' => $menu
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $menu = Menu::find($id);

        if (!$menu) {
            return response()->json([
                'success' => false,
                'message' => 'Menu tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'key' => 'required|string|max:100|unique:menu,key,' . $menu->id,
            'label' => 'required|string|max:150',
            'href' => 'nullable|string|max:255',
            'icon_name' => 'nullable|string|max:100',
            'section' => 'nullable|string|max:100',
            'departemen_id' => 'nullable|exists:hr_departemen,id',
            'urutan' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $menu->key = $request->key;
        $menu->label = $request->label;
        $menu->href = $request->href;
        $menu->icon_name = $request->icon_name;
        $menu->section = $request->section;
        $menu->departemen_id = $request->departemen_id;
        $menu->urutan = $request->urutan ?? $menu->urutan;
        $menu->update_at = now()->format('Y-m-d H:i:s');
        $menu->save();

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil diupdate',
            'data' => $menu
        ], 200);
    }

    public function destroy($id)
    {
        $menu = Menu::find($id);

        if (!$menu) {
            return response()->json([
                'success' => false,
                'message' => 'Menu tidak ditemukan'
            ], 404);
        }

        $menu->status = 'N';
        $menu->update_at = now()->format('Y-m-d H:i:s');
        $menu->save();

        return response()->json([
            'success' => true,
            'message' => 'Menu berhasil dihapus'
        ], 200);
    }
}
