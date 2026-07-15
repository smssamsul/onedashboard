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
            'Bucket' => env('AWS_BUCKET'),
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
    public function index()
    {
        $ecourses = Ecourse::orderBy('created_at', 'desc')->get();
        
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
        ]);

        $ecourse = Ecourse::create([
            'title' => $request->title,
            'description' => $request->description,
            'video_path' => $request->video_path,
            'is_active' => $request->is_active ?? true,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Ecourse created successfully',
            'data' => $ecourse
        ]);
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
