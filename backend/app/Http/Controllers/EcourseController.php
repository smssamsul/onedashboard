<?php

namespace App\Http\Controllers;

use App\Models\Ecourse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EcourseController extends Controller
{
    public function getUploadUrl()
    {
        $fileName = 'ecourses/' . uniqid() . '.mp4';

        $client = Storage::disk('s3')->getClient();

        $cmd = $client->getCommand('PutObject', [
            'Bucket' => config('filesystems.disks.s3.bucket'),
            'Key' => $fileName,
            'ContentType' => 'video/mp4',
        ]);

        $request = $client->createPresignedRequest($cmd, '+60 minutes');

        return response()->json([
            'status' => 'success',
            'upload_url' => (string) $request->getUri(),
            'path' => $fileName
        ]);
    }
    public function index(Request $request)
    {
        $ecourses = Ecourse::when($request->ecourse_bab_id, fn ($q) => $q->where('ecourse_bab_id', $request->ecourse_bab_id))
            ->when($request->boolean('unassigned'), fn ($q) => $q->whereNull('ecourse_bab_id'))
            ->orderBy('created_at', 'desc')
            ->get();

        $ecourses->map(function ($ecourse) {
            // Generate temporary url valid for 30 minutes
            if ($ecourse->video_path) {
                try {
                    $ecourse->video_url = Storage::disk('s3')->temporaryUrl(
                        $ecourse->video_path,
                        now()->addMinutes(30)
                    );
                } catch (\Exception $e) {
                    $ecourse->video_url = null;
                }
            } else {
                $ecourse->video_url = null;
            }
            return $ecourse;
        });

        return response()->json([
            'status' => 'success',
            'data' => $ecourses
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'video_path' => 'required|string',
            'ecourse_bab_id' => 'nullable|integer|exists:ecourse_bab,id',
        ]);

        $urutanBerikutnya = 1 + (int) Ecourse::where('ecourse_bab_id', $request->ecourse_bab_id)->max('urutan');

        $ecourse = Ecourse::create([
            'ecourse_bab_id' => $request->ecourse_bab_id,
            'title' => $request->title,
            'description' => $request->description,
            'video_path' => $request->video_path,
            'urutan' => $urutanBerikutnya,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ecourse created successfully',
            'data' => $ecourse
        ]);
    }

    public function update(Request $request, $id)
    {
        $ecourse = Ecourse::findOrFail($id);

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'ecourse_bab_id' => 'nullable|integer|exists:ecourse_bab,id',
            'is_active' => 'nullable|boolean',
        ]);

        // Kalau lesson dipindah/disambungkan ke bab lain (termasuk video lama
        // yang sebelumnya belum punya bab), taruh di urutan paling akhir bab
        // tujuan - bukan bawa urutan lama yang tidak relevan di bab baru.
        $urutan = $ecourse->urutan;
        if ((int) $request->ecourse_bab_id !== (int) $ecourse->ecourse_bab_id) {
            $urutan = 1 + (int) Ecourse::where('ecourse_bab_id', $request->ecourse_bab_id)
                ->where('id', '!=', $ecourse->id)
                ->max('urutan');
        }

        $ecourse->update([
            'title' => $request->title,
            'description' => $request->description,
            'ecourse_bab_id' => $request->ecourse_bab_id,
            'urutan' => $urutan,
            'is_active' => $request->is_active ?? $ecourse->is_active,
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $ecourse
        ]);
    }

    /**
     * Urutan lesson dalam satu bab, dikirim lengkap sebagai [{id, urutan}, ...].
     */
    public function reorder(Request $request)
    {
        $request->validate([
            'urutan' => 'required|array',
            'urutan.*.id' => 'required|integer|exists:ecourse,id',
            'urutan.*.urutan' => 'required|integer',
        ]);

        foreach ($request->urutan as $item) {
            Ecourse::where('id', $item['id'])->update(['urutan' => $item['urutan']]);
        }

        return response()->json(['status' => 'success']);
    }

    public function show($id)
    {
        $ecourse = Ecourse::findOrFail($id);

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

        return response()->json([
            'status' => 'success',
            'data' => $ecourse
        ]);
    }

    public function destroy($id)
    {
        $ecourse = Ecourse::findOrFail($id);

        if ($ecourse->video_path) {
            Storage::disk('s3')->delete($ecourse->video_path);
        }

        $ecourse->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Ecourse deleted successfully'
        ]);
    }
}
