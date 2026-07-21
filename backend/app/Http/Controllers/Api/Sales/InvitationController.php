<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invitation;
use App\Models\Customer;
use App\Models\Produk;
use App\Jobs\SyncContactToGoogleJob;
use App\Traits\ResolvesPublicCustomer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class InvitationController extends Controller
{
    use ResolvesPublicCustomer;

    /**
     * Format: INVddmmyyNNNN (NNNN reset per hari berdasarkan create_at), sama pola dengan kode_order.
     */
    private function generateKodeInvitation(Carbon $now): string
    {
        $prefix = 'INV' . $now->format('dmy');

        $lastKode = Invitation::query()
            ->whereNotNull('kode_invitation')
            ->where('kode_invitation', 'like', $prefix . '%')
            ->whereDate('create_at', $now->toDateString())
            ->lockForUpdate()
            ->orderBy('kode_invitation', 'desc')
            ->value('kode_invitation');

        $lastSeq = 0;
        if (is_string($lastKode) && strlen($lastKode) >= (strlen($prefix) + 4)) {
            $tail = substr($lastKode, -4);
            if (ctype_digit($tail)) {
                $lastSeq = (int) $tail;
            }
        }

        return $prefix . str_pad((string) ($lastSeq + 1), 4, '0', STR_PAD_LEFT);
    }

    /**
     * Admin: daftar invitation, filter produk/status/search.
     */
    public function index(Request $request)
    {
        $query = Invitation::with([
            'customer_rel:id,nama,wa,email,sales_id',
            'customer_rel.sales_rel:id,nama',
            'produk_rel:id,nama',
            'jadwal_rel:id,nama_jadwal,waktu_mulai',
            'referral_rel:id,nama,memberID',
            'create_by_rel:id,nama',
        ])->where('status', '!=', 'N');

        if ($request->filled('produk')) {
            $query->where('produk', $request->produk);
        }
        if ($request->filled('jadwal_id')) {
            $query->where('jadwal_id', $request->jadwal_id);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('customer_rel', function ($q) use ($search) {
                $q->where('nama', 'ilike', "%{$search}%")
                  ->orWhere('wa', 'ilike', "%{$search}%")
                  ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        $query->orderBy('create_at', 'desc');

        $perPage = $request->get('per_page', 15);
        $invitations = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $invitations->items(),
            'meta' => [
                'current_page' => $invitations->currentPage(),
                'last_page' => $invitations->lastPage(),
                'total' => $invitations->total(),
                'per_page' => $invitations->perPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $invitation = Invitation::with([
            'customer_rel', 'produk_rel:id,nama', 'jadwal_rel', 'referral_rel:id,nama,memberID', 'create_by_rel:id,nama',
        ])->find($id);

        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'data' => $invitation]);
    }

    /**
     * Admin: buat invitation manual dari dashboard.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string',
            'wa' => 'required|string',
            'email' => 'nullable|email',
            'produk' => 'required|integer|exists:produk,id',
            'jadwal_id' => 'nullable|integer|exists:produk_jadwal,id',
            'referral_customer' => 'nullable|integer|exists:customer,id',
            'sumber' => 'nullable|string',
            'catatan' => 'nullable|string',
            'utm_source' => 'nullable|string|max:255',
            'utm_medium' => 'nullable|string|max:255',
            'utm_campaign' => 'nullable|string|max:255',
            'utm_term' => 'nullable|string|max:255',
            'utm_content' => 'nullable|string|max:255',
        ]);

        $customer = $this->findOrCreateCustomer($validated, (int) $validated['produk']);

        $now = now();
        $invitation = DB::transaction(function () use ($validated, $customer, $now) {
            $kode = $this->generateKodeInvitation(Carbon::parse($now));

            return Invitation::create([
                'kode_invitation' => $kode,
                'customer' => $customer->id,
                'produk' => $validated['produk'],
                'jadwal_id' => $validated['jadwal_id'] ?? null,
                'referral_customer' => $validated['referral_customer'] ?? null,
                'create_by' => Auth::id(),
                'sumber' => $validated['sumber'] ?? 'admin',
                'catatan' => $validated['catatan'] ?? null,
                'utm_source' => $validated['utm_source'] ?? null,
                'utm_medium' => $validated['utm_medium'] ?? null,
                'utm_campaign' => $validated['utm_campaign'] ?? null,
                'utm_term' => $validated['utm_term'] ?? null,
                'utm_content' => $validated['utm_content'] ?? null,
                'create_at' => $now,
                'status' => '1',
            ]);
        });

        if (!empty($customer->wa)) {
            SyncContactToGoogleJob::dispatchSync($customer->nama ?? '', $customer->wa, $customer->id, (string) ($customer->sales_id ?? '1'));
        }

        return response()->json(['success' => true, 'data' => $invitation->load('customer_rel', 'produk_rel:id,nama')], 201);
    }

    /**
     * Publik: submit dari link undangan. Referral diresolve dari memberID (query ?ref=), bukan id mentah.
     */
    public function publicStore(Request $request)
    {
        $validated = $request->validate([
            'nama' => 'required|string',
            'wa' => 'required|string',
            'email' => 'nullable|email',
            'produk' => 'required|integer|exists:produk,id',
            'jadwal_id' => 'nullable|integer|exists:produk_jadwal,id',
            'ref' => 'nullable|string',
            'sumber' => 'nullable|string',
            'utm_source' => 'nullable|string|max:255',
            'utm_medium' => 'nullable|string|max:255',
            'utm_campaign' => 'nullable|string|max:255',
            'utm_term' => 'nullable|string|max:255',
            'utm_content' => 'nullable|string|max:255',
        ]);

        $produk = Produk::findOrFail($validated['produk']);

        $customer = $this->findOrCreateCustomer($validated, $produk->id);

        $existingInvitation = Invitation::where('customer', $customer->id)
            ->where('produk', $produk->id)
            ->where('status', '!=', 'N')
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'success' => true,
                'message' => 'Anda sudah terdaftar undangan untuk produk ini',
                'data' => $existingInvitation,
            ]);
        }

        $referralCustomer = null;
        if (!empty($validated['ref'])) {
            $referralCustomer = Customer::where('memberID', $validated['ref'])
                ->where('status', '!=', 'N')
                ->first();
        }

        $now = now();
        $invitation = DB::transaction(function () use ($validated, $produk, $customer, $referralCustomer, $now) {
            $kode = $this->generateKodeInvitation(Carbon::parse($now));

            return Invitation::create([
                'kode_invitation' => $kode,
                'customer' => $customer->id,
                'produk' => $produk->id,
                'jadwal_id' => $validated['jadwal_id'] ?? null,
                'referral_customer' => $referralCustomer->id ?? null,
                'create_by' => null,
                'sumber' => $validated['sumber'] ?? 'link',
                'utm_source' => $validated['utm_source'] ?? null,
                'utm_medium' => $validated['utm_medium'] ?? null,
                'utm_campaign' => $validated['utm_campaign'] ?? null,
                'utm_term' => $validated['utm_term'] ?? null,
                'utm_content' => $validated['utm_content'] ?? null,
                'create_at' => $now,
                'status' => '1',
            ]);
        });

        if (!empty($customer->wa)) {
            SyncContactToGoogleJob::dispatchSync($customer->nama ?? '', $customer->wa, $customer->id, (string) ($customer->sales_id ?? '1'));
        }

        return response()->json(['success' => true, 'data' => $invitation], 201);
    }

    /**
     * Publik: halaman konfirmasi undangan, lookup by kode_invitation atau id.
     */
    public function publicShow($id)
    {
        $invitation = Invitation::with(['customer_rel:id,nama,wa,email', 'produk_rel:id,nama,gambar,tempat,kota,tanggal_event', 'jadwal_rel'])
            ->where(function ($q) use ($id) {
                $q->where('kode_invitation', $id)->orWhere('id', $id);
            })->first();

        if (!$invitation || $invitation->status == 'N') {
            return response()->json(['success' => false, 'message' => 'Invitation tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'data' => $invitation]);
    }

    public function update(Request $request, $id)
    {
        $invitation = Invitation::find($id);
        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation tidak ditemukan'], 404);
        }

        $validated = $request->validate([
            'jadwal_id' => 'nullable|integer|exists:produk_jadwal,id',
            'referral_customer' => 'nullable|integer|exists:customer,id',
            'catatan' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        $validated['update_at'] = now();
        $invitation->update($validated);

        return response()->json(['success' => true, 'data' => $invitation]);
    }

    public function destroy($id)
    {
        $invitation = Invitation::find($id);
        if (!$invitation) {
            return response()->json(['success' => false, 'message' => 'Invitation tidak ditemukan'], 404);
        }

        $invitation->update(['status' => 'N', 'update_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Invitation dihapus']);
    }
}
