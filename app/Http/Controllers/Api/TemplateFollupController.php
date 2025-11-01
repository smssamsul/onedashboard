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
    
    public function index()
    {
        $data = TemplateFollup::all();
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
            'event' => 'nullable|string|max:100',
        ]);

        $template = TemplateFollup::create([
            'nama' => $request->nama,
            'text' => $request->text,
            'event' => $request->event,
            'create_at' => now(),
            'status' => '1'
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template Follow-up berhasil dibuat',
            'data' => $template
        ], 201);
    }

    public function show($id)
    {
        $template = TemplateFollup::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template Follow-up tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $template
        ]);
    }

    public function update(Request $request, $id)
    {
        $template = TemplateFollup::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template Follow-up tidak ditemukan'
            ], 404);
        }

        $template->update([
            'nama' => $request->nama ?? $template->nama,
            'text' => $request->text ?? $template->text,
            'event' => $request->event ?? $template->event,
            'update_at' => now()
            // 'status' => $request->status ?? $template->status
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template Follow-up berhasil diperbarui',
            'data' => $template
        ]);
    }

    public function destroy($id)
    {
        $template = TemplateFollup::find($id);

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template Follow-up tidak ditemukan'
            ], 404);
        }

        $template->update([
            'status'    => "2"
        ]);

        $template->delete();

        return response()->json([
            'success' => true,
            'message' => 'Template Follow-up berhasil dihapus'
        ]);
    }
}