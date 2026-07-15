<?php

namespace App\Http\Controllers\Api\Sales;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TemplateFollup;

class TemplateFollupController extends Controller
{
    /**
     * Urutan kirim / tampilan: reminder type 1 diurutkan naik berdasarkan event (hari lalu jam).
     */
    public static function eventSortKey(?string $event): int
    {
        if ($event === null || $event === '' || strpos($event, '-') === false) {
            return 0;
        }
        try {
            [$hariPart, $jamPart] = explode('-', $event, 2);
            $jumlahHari = (int) str_replace(['d', 'D'], '', strtolower($hariPart));
            $jamKirim = trim((string) $jamPart) ?: '09:00';
            $parts = explode(':', $jamKirim);
            $h = (int) ($parts[0] ?? 9);
            $m = (int) ($parts[1] ?? 0);

            return max(0, $jumlahHari) * 1440 + max(0, min(23, $h)) * 60 + max(0, min(59, $m));
        } catch (\Throwable $e) {
            return 0;
        }
    }

    public function __construct()
    {
        $this->middleware('auth:api');
    }
    
    public function index(Request $request)
    {
        $produkId = $request->input('produk_id') ?? $request->query('produk_id');
        if ($produkId === null || $produkId === '') {
            return response()->json([
                'success' => false,
                'message' => 'produk_id wajib diisi',
            ], 422);
        }

        $all = TemplateFollup::active()
            ->where('produk_id', $produkId)
            ->orderBy('type')
            ->orderBy('id')
            ->get();

        [$ones, $rest] = $all->partition(fn ($t) => (string) $t->type === '1');
        $sortedOnes = $ones->sortBy(fn ($t) => self::eventSortKey($t->event))->values();
        $sortedRest = $rest->sortBy(fn ($t) => (string) $t->type)->values();
        $data = $sortedOnes->concat($sortedRest)->values();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

   public function store(Request $request)
    {
        $request->validate([
            'id' => 'nullable|integer',
            'nama' => 'required|string|max:255',
            'text' => 'required|string',
            'produk' => 'required|integer',
            'status' => 'required|string',
            'type' => 'nullable|string|max:100',
            'event' => 'nullable|string|max:100',
        ]);

        $produkId = (int) $request->produk;

        // Update by id (modal edit)
        if ($request->filled('id')) {
            $existing = TemplateFollup::active()
                ->where('id', $request->id)
                ->where('produk_id', $produkId)
                ->first();
        } elseif ((string) $request->type === '1') {
            // Banyak template reminder unpaid dengan type sama (1), bedakan lewat nama + event
            $existing = TemplateFollup::active()
                ->where('produk_id', $produkId)
                ->where('type', '1')
                ->where('nama', $request->nama)
                ->first();
        } else {
            // Satu template per type (selain reminder unpaid)
            $existing = TemplateFollup::active()
                ->where('produk_id', $produkId)
                ->when($request->type, fn ($q) => $q->where('type', $request->type))
                ->first();
        }

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
                'produk_id' => $produkId,
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

    /**
     * Nonaktifkan template (soft): status N — data tetap di DB, tidak tampil di daftar/cron.
     */
    public function archive(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
            'produk' => 'required|integer',
        ]);

        $produkId = (int) $request->produk;
        $template = TemplateFollup::active()
            ->where('id', $request->id)
            ->where('produk_id', $produkId)
            ->first();

        if (!$template) {
            return response()->json([
                'success' => false,
                'message' => 'Template tidak ditemukan atau sudah dinonaktifkan',
            ], 404);
        }

        $template->update([
            'status' => 'N',
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Template berhasil dinonaktifkan',
        ]);
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