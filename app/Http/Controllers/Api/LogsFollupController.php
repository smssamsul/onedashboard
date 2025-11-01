<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LogsFollup;

class LogsFollupController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:api');
    }
    
     public function index(Request $request)
    {
        $tanggal = $request->query('tanggal');

        $query = LogsFollup::with(['follup_rel', 'customer_rel']);

        if ($tanggal) {
            $query->whereDate('create_at', $tanggal);
        }

        $logs = $query->orderBy('create_at', 'desc')->get();

        return response()->json([
            'message' => 'Data logs follow up berhasil diambil',
            'total' => $logs->count(),
            'data' => $logs
        ]);
    }

    public function show($id)
    {
        $log = LogsFollup::with(['follup_rel', 'customer_rel'])->find($id);

        if (!$log) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        return response()->json($log);
    }

   
}

