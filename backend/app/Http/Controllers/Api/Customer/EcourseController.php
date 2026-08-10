<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ecourse;
use App\Models\EcourseProgress;
use App\Models\OrderCustomer;
use App\Models\Produk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EcourseController extends Controller
{
    /**
     * Produk yang dianggap "lunas" dan bisa diakses kontennya. Sama dengan
     * konvensi status pembayaran yang dipakai CustomerDashboardController.
     */
    private function produkIdYangDibeli(int $customerId)
    {
        return OrderCustomer::where('customer', $customerId)
            ->where('status_pembayaran', '2')
            ->where('status', '!=', 'N')
            ->pluck('produk')
            ->unique();
    }

    /**
     * Daftar kursus yang sudah dibeli customer, untuk halaman "Kursus Saya".
     */
    public function myCourses(Request $request)
    {
        $customer = Customer::find(auth('customer')->user()->id);
        $produkIds = $this->produkIdYangDibeli($customer->id);

        $courses = Produk::whereIn('id', $produkIds)
            ->whereHas('ecourseBabs.ecourses')
            ->with(['ecourseBabs.ecourses:id,ecourse_bab_id'])
            ->get(['id', 'nama', 'gambar', 'deskripsi']);

        $progressSelesai = EcourseProgress::where('customer_id', $customer->id)
            ->where('is_completed', true)
            ->pluck('ecourse_id')
            ->flip();

        $data = $courses->map(function ($produk) use ($progressSelesai) {
            $lessonIds = $produk->ecourseBabs->flatMap(fn ($bab) => $bab->ecourses->pluck('id'));
            $total = $lessonIds->count();
            $selesai = $lessonIds->filter(fn ($id) => isset($progressSelesai[$id]))->count();

            return [
                'id' => $produk->id,
                'nama' => $produk->nama,
                'gambar' => $produk->gambar,
                'deskripsi' => $produk->deskripsi,
                'total_lesson' => $total,
                'lesson_selesai' => $selesai,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Struktur kurikulum (bab -> lesson) + video url sementara + status
     * progress, untuk halaman viewer kursus. Ownership dicek di sini
     * (server-side), bukan cuma dipercaya dari frontend.
     */
    public function show(Request $request, $produkId)
    {
        $customer = Customer::find(auth('customer')->user()->id);

        $punyaAkses = $this->produkIdYangDibeli($customer->id)->contains($produkId);
        if (!$punyaAkses) {
            abort(403, 'Anda belum membeli kursus ini.');
        }

        $produk = Produk::findOrFail($produkId);
        $babs = $produk->ecourseBabs()->with('ecourses')->get();

        $lessonIds = $babs->flatMap(fn ($bab) => $bab->ecourses->pluck('id'));
        $progressMap = EcourseProgress::where('customer_id', $customer->id)
            ->whereIn('ecourse_id', $lessonIds)
            ->pluck('is_completed', 'ecourse_id');

        $babs->each(function ($bab) use ($progressMap) {
            $bab->ecourses->each(function ($ecourse) use ($progressMap) {
                $ecourse->is_completed = (bool) ($progressMap[$ecourse->id] ?? false);

                if ($ecourse->video_path) {
                    try {
                        $ecourse->video_url = Storage::disk('s3')->temporaryUrl(
                            $ecourse->video_path,
                            now()->addMinutes(30)
                        );
                    } catch (\Exception $e) {
                        $ecourse->video_url = null;
                    }
                }
            });
        });

        return response()->json([
            'status' => 'success',
            'data' => [
                'produk' => $produk->only(['id', 'nama', 'deskripsi', 'gambar']),
                'bab' => $babs,
            ],
        ]);
    }

    /**
     * Tandai satu lesson selesai/belum ditonton oleh customer yang login.
     */
    public function markProgress(Request $request, $ecourseId)
    {
        $customer = Customer::find(auth('customer')->user()->id);
        $ecourse = Ecourse::with('bab')->findOrFail($ecourseId);

        $produkId = $ecourse->bab->produk_id ?? null;
        $punyaAkses = $produkId && $this->produkIdYangDibeli($customer->id)->contains($produkId);
        if (!$punyaAkses) {
            abort(403, 'Anda belum membeli kursus ini.');
        }

        $isCompleted = $request->boolean('is_completed', true);

        $progress = EcourseProgress::updateOrCreate(
            ['customer_id' => $customer->id, 'ecourse_id' => $ecourseId],
            [
                'is_completed' => $isCompleted,
                'completed_at' => $isCompleted ? now() : null,
            ]
        );

        return response()->json([
            'status' => 'success',
            'data' => $progress,
        ]);
    }
}
