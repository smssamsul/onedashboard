<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TemplateFollup;

class TemplateFollupController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api');
    }
    
    public function index(Request $request)
    {
        $produkId = $request->produk_id;

        $data = TemplateFollup::where('status', '!=', 'N')
        ->where('produk_id',$produkId)
        ->get();

        return response()->json([
            'success' => true,
            'data' => $data
        ]);
    }

   public function store(Request $request)
    {
        $request->validate([
            'nama' => 'required|string|max:255',
            'text' => 'required|string',
            'produk' => 'required|integer',
            'status' => 'required|string',
            'type' => 'nullable|string|max:100',
            'event' => 'nullable|string|max:100',
        ]);

        $existing = TemplateFollup::where('produk_id', $request->produk)
            ->when($request->event, fn($q) => $q->where('event', $request->event))
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->first();

        if ($existing) {

            $existing->update([
                'nama' => $request->nama,
                'text' => $request->text,
                'status' => $request->status,
                'type' => $request->type,
                'event' => $request->event,
                'update_at' => now(),
            ]);

            $template = $existing;
            $message = 'Template Follow-up berhasil diperbarui';
        } else {

            $template = TemplateFollup::create([
                'nama' => $request->nama,
                'text' => $request->text,
                'produk_id' => $request->produk,
                'event' => $request->event,
                'status' => $request->status,
                'type' => $request->type,
                'create_at' => now(),
            ]);

            $message = 'Template Follow-up berhasil dibuat';
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $template
        ], 201);
    }

    // public function show($id)
    // {
    //     $template = TemplateFollup::where('id', $id)
    //             ->where('produk',$request->query('produk_id'))
    //             ->where('status', '!=', 'N')
    //             ->first();

    //     if (!$template) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Template Follow-up tidak ditemukan'
    //         ], 404);
    //     }

    //     return response()->json([
    //         'success' => true,
    //         'data' => $template
    //     ]);
    // }

    // public function update(Request $request, $id)
    // {
    //     $template = TemplateFollup::find($id);

    //     if (!$template) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Template Follow-up tidak ditemukan'
    //         ], 404);
    //     }

    //     $template->update([
    //         'nama' => $request->nama ?? $template->nama,
    //         'text' => $request->text ?? $template->text,
    //         'event' => $request->event ?? $template->event,
    //         'update_at' => now()
    //         // 'status' => $request->status ?? $template->status
    //     ]);

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Template Follow-up berhasil diperbarui',
    //         'data' => $template
    //     ]);
    // }

    // public function destroy($id)
    // {
    //     $template = TemplateFollup::find($id);

    //     if (!$template) {
    //         return response()->json([
    //             'success' => false,
    //             'message' => 'Template Follow-up tidak ditemukan'
    //         ], 404);
    //     }

    //     $template->update([
    //         'status'    => "2"
    //     ]);

    //     $template->delete();

    //     return response()->json([
    //         'success' => true,
    //         'message' => 'Template Follow-up berhasil dihapus'
    //     ]);
    // }
}