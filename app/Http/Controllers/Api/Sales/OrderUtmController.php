<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use App\Models\OrderCustomer;
use Illuminate\Http\Request;

class OrderUtmController extends Controller
{
    /**
     * Daftar order yang memiliki minimal satu parameter UTM terisi.
     * Sales staff (divisi 3, level 2): hanya order customer milik sales tersebut.
     * Leader / role lain di grup sales: semua order (sama seperti index order).
     */
    public function index(Request $request)
    {
        $userLogin = auth('api')->user();
        $userLogin->load('userData');
        $user = $userLogin->userData;

        $query = OrderCustomer::query()
            ->hasUtmParams()
            ->where('status', '!=', 'N');

        $isStaffSales = $user && (string) $user->divisi === '3' && (string) $user->level === '2';

        if ($isStaffSales) {
            $query->whereHas('customer_rel', function ($q) use ($user) {
                $q->where('sales_id', $user->id)
                    ->where('status', '!=', 'N');
            });
        }
        
        // Filter berdasarkan Produk ID
        $pIds = $request->input('produk_id') ?? $request->input('product_id') ?? $request->input('produk_id[]') ?? $request->input('product_id[]');
        if ($pIds) {
            $produks = is_array($pIds) ? $pIds : [$pIds];
            $produks = array_filter($produks, fn($val) => !is_null($val) && $val !== '' && $val !== 'undefined');
            if (!empty($produks)) {
                $query->where(function($q) use ($produks) {
                    $q->whereIn('produk', $produks)
                      ->orWhereIn('bundling', $produks);
                });
            }
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('id', 'like', '%' . $search . '%')
                    ->orWhere('utm_source', 'like', '%' . $search . '%')
                    ->orWhere('utm_medium', 'like', '%' . $search . '%')
                    ->orWhere('utm_campaign', 'like', '%' . $search . '%')
                    ->orWhere('utm_term', 'like', '%' . $search . '%')
                    ->orWhere('utm_content', 'like', '%' . $search . '%')
                    ->orWhere('custom_value', 'like', '%' . $search . '%');
            });
        }

        $query->orderBy('create_at', 'desc');

        $perPage = (int) $request->get('per_page', 15);
        $paginator = $query->paginate($perPage);

        $items = collect($paginator->items())->map(function (OrderCustomer $order) {
            return [
                'id' => $order->id,
                'order_ref' => $order->resolvePublicOrderRef(),
                'create_at' => $order->create_at,
                'utm_source' => $order->utm_source,
                'utm_medium' => $order->utm_medium,
                'utm_campaign' => $order->utm_campaign,
                'utm_term' => $order->utm_term,
                'utm_content' => $order->utm_content,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Data order UTM berhasil diambil',
            'data' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
