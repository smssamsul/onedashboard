<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AktivitasLead;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class AktivitasLeadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Menampilkan daftar aktivitas untuk lead tertentu
     */
    public function index(Request $request, $leadId)
    {
        $query = AktivitasLead::where('lead_id', $leadId)
            ->with(['user_rel:id,nama'])
            ->orderBy('create_at', 'desc');

        $perPage = $request->get('per_page', 50);
        $aktivitas = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data aktivitas berhasil diambil',
            'data' => $aktivitas->items(),
            'pagination' => [
                'current_page' => $aktivitas->currentPage(),
                'last_page' => $aktivitas->lastPage(),
                'per_page' => $aktivitas->perPage(),
                'total' => $aktivitas->total(),
            ],
        ]);
    }

    /**
     * Menampilkan detail aktivitas
     */
    public function show($id)
    {
        $aktivitas = AktivitasLead::with(['lead_rel', 'user_rel:id,nama'])
            ->find($id);

        if (!$aktivitas) {
            return response()->json([
                'success' => false,
                'message' => 'Aktivitas tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Data aktivitas berhasil diambil',
            'data' => $aktivitas
        ]);
    }
}

