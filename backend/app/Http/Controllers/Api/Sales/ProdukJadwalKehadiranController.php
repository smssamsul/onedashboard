<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProdukJadwal;
use App\Models\ProdukJadwalKehadiran;
use App\Models\OrderCustomer;
use App\Models\Invitation;
use App\Models\Customer;
use App\Traits\ResolvesPublicCustomer;
use Illuminate\Support\Facades\Auth;

class ProdukJadwalKehadiranController extends Controller
{
    use ResolvesPublicCustomer;

    /**
     * Cari order atau invitation aktif milik customer untuk produk terkait jadwal ini.
     * Dipakai untuk menentukan source_type/source_id saat check-in, dan untuk
     * memutuskan siapa yang berhak upselling follow-up nantinya.
     */
    private function findSourceForCustomer(Customer $customer, int $produkId): array
    {
        $order = OrderCustomer::where('customer', $customer->id)
            ->where('produk', $produkId)
            ->where('status', '!=', 'N')
            ->where('status_order', '!=', '3') // exclude rejected
            ->orderBy('create_at', 'desc')
            ->first();

        if ($order) {
            return ['order', $order->id];
        }

        $invitation = Invitation::where('customer', $customer->id)
            ->where('produk', $produkId)
            ->where('status', '!=', 'N')
            ->orderBy('create_at', 'desc')
            ->first();

        if ($invitation) {
            return ['invitation', $invitation->id];
        }

        return [null, null];
    }

    /**
     * Publik: info jadwal + produk untuk halaman landing check-in (hasil scan QR).
     */
    public function publicJadwalInfo($jadwalId)
    {
        $jadwal = ProdukJadwal::with('produk:id,nama,gambar,tempat,kota')
            ->where('status', '!=', 'N')
            ->find($jadwalId);

        if (!$jadwal) {
            return response()->json(['success' => false, 'message' => 'Jadwal tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'data' => $jadwal]);
    }

    /**
     * Publik: daftar hadir untuk layar display di lokasi acara.
     * Hanya nama + waktu check-in yang ditampilkan (tanpa WA/email) karena ini publik.
     *
     * Difilter juga by tanggal_jadwal (snapshot) supaya kalau jadwal_id ini dipakai
     * ulang untuk sesi lain di tanggal berbeda, layar cuma nampilin peserta SESI INI
     * saja — bukan riwayat lama yang kebetulan nempel di jadwal_id yang sama.
     */
    public function publicKehadiranList($jadwalId)
    {
        $jadwal = ProdukJadwal::where('status', '!=', 'N')->find($jadwalId);
        if (!$jadwal) {
            return response()->json(['success' => false, 'message' => 'Jadwal tidak ditemukan'], 404);
        }

        $kehadiran = ProdukJadwalKehadiran::with('customer_rel:id,nama')
            ->where('jadwal_id', $jadwalId)
            ->where('tanggal_jadwal', $jadwal->waktu_mulai)
            ->where('status_hadir', 'hadir')
            ->where('status', '!=', 'N')
            ->orderBy('waktu_checkin', 'desc')
            ->limit(200)
            ->get()
            ->map(function ($row) {
                return [
                    'nama' => $row->customer_rel->nama ?? 'Peserta',
                    'waktu_checkin' => $row->waktu_checkin,
                ];
            });

        return response()->json([
            'success' => true,
            'total' => $kehadiran->count(),
            'data' => $kehadiran,
        ]);
    }

    /**
     * Publik: cek nomor WA sebelum check-in. Kalau customer & pendaftaran (order/invitation)
     * untuk produk terkait sudah ada, tampilkan konfirmasi tanpa isi ulang form.
     * Kalau belum ada sama sekali, frontend munculkan form nama/email singkat.
     */
    public function publicLookup(Request $request)
    {
        $validated = $request->validate([
            'jadwal_id' => 'required|integer|exists:produk_jadwal,id',
            'wa' => 'required|string',
        ]);

        $jadwal = ProdukJadwal::find($validated['jadwal_id']);
        if (!$jadwal) {
            return response()->json(['success' => false, 'message' => 'Jadwal tidak ditemukan'], 404);
        }

        $wa = $this->formatPhoneNumber($validated['wa']);
        $customer = Customer::where('wa', $wa)->where('status', '!=', 'N')->first();

        if (!$customer) {
            return response()->json(['success' => true, 'found' => false]);
        }

        [$sourceType, $sourceId] = $this->findSourceForCustomer($customer, $jadwal->produk_id);

        // Cocokkan tanggal_jadwal juga — kalau jadwal_id ini bekas sesi lama yang
        // tanggalnya sudah diedit ke sesi baru, jangan anggap "sudah checkin".
        $sudahCheckin = ProdukJadwalKehadiran::where('jadwal_id', $jadwal->id)
            ->where('customer_id', $customer->id)
            ->where('tanggal_jadwal', $jadwal->waktu_mulai)
            ->where('status', '!=', 'N')
            ->exists();

        return response()->json([
            'success' => true,
            'found' => true,
            'data' => [
                'nama' => $customer->nama,
                'wa' => $customer->wa,
                'email' => $customer->email,
                'source_type' => $sourceType,
                'sudah_checkin' => $sudahCheckin,
            ],
        ]);
    }

    /**
     * Publik: self check-in oleh peserta (scan QR -> isi wa -> submit).
     * Kalau nomor belum dikenal, nama wajib diisi (form baru).
     */
    public function publicCheckin(Request $request)
    {
        $validated = $request->validate([
            'jadwal_id' => 'required|integer|exists:produk_jadwal,id',
            'wa' => 'required|string',
            'nama' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $jadwal = ProdukJadwal::find($validated['jadwal_id']);
        if (!$jadwal) {
            return response()->json(['success' => false, 'message' => 'Jadwal tidak ditemukan'], 404);
        }

        $wa = $this->formatPhoneNumber($validated['wa']);
        $existingCustomer = Customer::where('wa', $wa)->where('status', '!=', 'N')->first();

        if (!$existingCustomer && empty($validated['nama'])) {
            return response()->json([
                'success' => false,
                'message' => 'Nomor belum terdaftar, nama wajib diisi',
                'need_form' => true,
            ], 422);
        }

        $customer = $this->findOrCreateCustomer([
            'nama' => $validated['nama'] ?? $existingCustomer->nama,
            'wa' => $wa,
            'email' => $validated['email'] ?? null,
        ], $jadwal->produk_id);

        [$sourceType, $sourceId] = $this->findSourceForCustomer($customer, $jadwal->produk_id);

        // Match key sertakan tanggal_jadwal: kalau jadwal_id ini dipakai ulang dengan
        // tanggal baru, ini dianggap sesi BARU (baris baru), bukan menimpa yang lama.
        $kehadiran = ProdukJadwalKehadiran::updateOrCreate(
            ['jadwal_id' => $jadwal->id, 'customer_id' => $customer->id, 'tanggal_jadwal' => $jadwal->waktu_mulai],
            [
                'produk_id' => $jadwal->produk_id,
                'nama_jadwal_snapshot' => $jadwal->nama_jadwal,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'status_hadir' => 'hadir',
                'waktu_checkin' => now(),
                'checked_by' => null,
                'update_at' => now(),
                'create_at' => now(),
                'status' => '1',
            ]
        );

        return response()->json(['success' => true, 'data' => $kehadiran]);
    }

    /**
     * Admin: daftar kehadiran per produk (lintas semua sesi/jadwal produk itu).
     * Sengaja tidak difilter per jadwal_id — produk seminar tertentu dipakai
     * berulang dengan jadwal yang sama cuma tanggalnya diedit, jadi filter by
     * produk lebih stabil buat dashboard admin lihat semua peserta.
     */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'produk_id' => 'required|integer|exists:produk,id',
        ]);

        $kehadiran = ProdukJadwalKehadiran::with(['customer_rel:id,nama,wa,email', 'checked_by_rel:id,nama'])
            ->where('produk_id', $validated['produk_id'])
            ->where('status', '!=', 'N')
            ->orderBy('tanggal_jadwal', 'desc')
            ->orderBy('waktu_checkin', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $kehadiran]);
    }

    /**
     * Admin: tandai hadir manual (tanpa self check-in peserta).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'jadwal_id' => 'required|integer|exists:produk_jadwal,id',
            'customer_id' => 'required|integer|exists:customer,id',
        ]);

        $jadwal = ProdukJadwal::find($validated['jadwal_id']);
        $customer = Customer::find($validated['customer_id']);

        [$sourceType, $sourceId] = $this->findSourceForCustomer($customer, $jadwal->produk_id);

        $kehadiran = ProdukJadwalKehadiran::updateOrCreate(
            ['jadwal_id' => $jadwal->id, 'customer_id' => $customer->id, 'tanggal_jadwal' => $jadwal->waktu_mulai],
            [
                'produk_id' => $jadwal->produk_id,
                'nama_jadwal_snapshot' => $jadwal->nama_jadwal,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'status_hadir' => 'hadir',
                'waktu_checkin' => now(),
                'checked_by' => Auth::id(),
                'update_at' => now(),
                'create_at' => now(),
                'status' => '1',
            ]
        );

        return response()->json(['success' => true, 'data' => $kehadiran]);
    }

    /**
     * Admin: batalkan kehadiran (soft delete).
     */
    public function destroy($id)
    {
        $kehadiran = ProdukJadwalKehadiran::find($id);
        if (!$kehadiran) {
            return response()->json(['success' => false, 'message' => 'Data kehadiran tidak ditemukan'], 404);
        }

        $kehadiran->update(['status' => 'N', 'update_at' => now()]);

        return response()->json(['success' => true, 'message' => 'Kehadiran dibatalkan']);
    }
}
