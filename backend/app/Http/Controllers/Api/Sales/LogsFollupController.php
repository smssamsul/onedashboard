<?php

namespace App\Http\Controllers\Api\Sales;

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

        $query = LogsFollup::with([
            'follup_rel',
            'customer_rel:id,nama,wa']);

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


    public function show(Request $request)
    {
        // $tanggal = $request->query('tanggal');
        // $customerId = $request->query('customer_id');
        // $event = $request->query('event');
        

        $logs = LogsFollup::with([
            'follup_rel',
            'customer_rel:id,nama,wa'
        ]);

        if($request->customer){
            $logs->where('customer', $request->customer);
        }

        if($request->tanggal){
            $logs->where('create_at', $request->tanggal);
        }

        if($request->event){
            $logs->whereHas('follup_rel', fn($q) => $q->where('event', $request->event));
        }

        $logs = $logs->orderByDesc('create_at')->get();

        return response()->json([
            'message' => 'Data logs follow up berhasil diambil',
            'total' => $logs->count(),
            'data' => $logs
        ]);
    }



   
}

