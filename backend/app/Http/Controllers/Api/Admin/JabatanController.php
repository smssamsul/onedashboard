<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Jabatan;

class JabatanController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index()
    {
        $jabatan = Jabatan::orderBy('id')->get();

        return response()->json([
            'success' => true,
            'data' => $jabatan
        ], 200);
    }
}
