<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\LeadLpwa;
use App\Models\OrderCustomer;
use App\Models\Customer;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;

class LeadLpwaController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = LeadLpwa::with(['produk', 'sales']);

        $user = Auth::user();
        $realUser = $user ? $user->userData : null;

        if ($realUser && $realUser->level == 2) {
            $query->where('sales_id', $realUser->id);
        } elseif ($request->has('sales_id')) {
            $query->where('sales_id', $request->sales_id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('nama', 'like', "%{$search}%")
                  ->orWhere('no_wa', 'like', "%{$search}%");
            });
        }

        $query->orderBy('created_at', 'desc');
        
        $perPage = $request->get('per_page', 15);
        $leads = $query->paginate($perPage);

        // Append order status
        $leads->getCollection()->transform(function ($lead) {
            $order = OrderCustomer::where('produk', $lead->produk_id)
                ->whereHas('customer_rel', function ($q) use ($lead) {
                    $q->where('wa', $lead->no_wa);
                })
                ->whereNotIn('status_order', ['3', '3 '])
                ->where('status', '!=', 'N')
                ->latest('id')
                ->first();
            
            $lead->order_exists = $order ? true : false;
            $lead->order_code = $order ? $order->kode_order : null;
            $lead->order_id = $order ? $order->id : null;
            return $lead;
        });

        return response()->json([
            'success' => true,
            'message' => 'Data Leads berhasil diambil',
            'debug' => [
                'user' => $user ? $user->user : null,
                'level' => $user ? $user->level : null,
            ],
            'data' => $leads->items(),
            'pagination' => [
                'current_page' => $leads->currentPage(),
                'last_page' => $leads->lastPage(),
                'per_page' => $leads->perPage(),
                'total' => $leads->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'nama' => 'required|string|max:255',
            'no_wa' => 'required|string|max:255',
            'produk_id' => 'required|exists:produk,id',
            'sales_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $lead = LeadLpwa::create($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Leads berhasil ditambahkan',
            'data' => $lead
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $lead = LeadLpwa::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead LPWA tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'nama' => 'sometimes|required|string|max:255',
            'no_wa' => 'sometimes|required|string|max:255',
            'produk_id' => 'sometimes|required|exists:produk,id',
            'sales_id' => 'nullable|exists:users,id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $lead->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Leads berhasil diperbarui',
            'data' => $lead
        ]);
    }

    public function destroy($id)
    {
        $lead = LeadLpwa::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead LPWA tidak ditemukan'
            ], 404);
        }

        $lead->delete();

        return response()->json([
            'success' => true,
            'message' => 'Leads berhasil dihapus'
        ]);
    }
}
