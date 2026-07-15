<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TemplateBroadcast;

class TemplateBroadcastController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = TemplateBroadcast::active()->orderBy('id', 'desc');

        if ($request->has('sales_id') && $request->sales_id) {
            $query->where(function($q) use ($request) {
                $q->where('sales_id', $request->sales_id)
                  ->orWhereNull('sales_id');
            });
        }

        $templates = $query->get();

        return response()->json([
            'success' => true,
            'message' => 'Data template broadcast berhasil diambil',
            'data' => $templates
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'judul' => 'required|string|max:255',
            'isi' => 'required|string',
            'sales_id' => 'nullable|integer',
        ]);

        $template = TemplateBroadcast::create([
            'judul' => $validated['judul'],
            'isi' => $validated['isi'],
            'sales_id' => $validated['sales_id'] ?? null,
            'status' => '1',
            'create_at' => now(),
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template broadcast berhasil disimpan',
            'data' => $template
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $template = TemplateBroadcast::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan'
            ], 404);
        }

        $validated = $request->validate([
            'judul' => 'required|string|max:255',
            'isi' => 'required|string',
            'sales_id' => 'nullable|integer',
        ]);

        $template->update([
            'judul' => $validated['judul'],
            'isi' => $validated['isi'],
            'sales_id' => $validated['sales_id'] ?? null,
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template broadcast berhasil diubah',
            'data' => $template
        ]);
    }

    public function destroy($id)
    {
        $template = TemplateBroadcast::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan'
            ], 404);
        }

        $template->update([
            'status' => '0',
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template broadcast berhasil dihapus'
        ]);
    }
}
