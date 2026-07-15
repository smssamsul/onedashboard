<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Post;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class PostController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $query = Post::orderBy('create_at', 'desc');

        // Filter by status
        
        $query->where('status', "1");
        

        // Search by title
        if ($request->has('search')) {
            $query->where('title', 'like', '%' . $request->search . '%');
        }

        // Pagination
        $perPage = $request->get('per_page', 15);
        $posts = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $posts->items(),
            'pagination' => [
                'current_page' => $posts->currentPage(),
                'last_page' => $posts->lastPage(),
                'per_page' => $posts->perPage(),
                'total' => $posts->total(),
            ]
        ], 200);
    }

    public function show($id)
    {
        $post = Post::find($id);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $post
        ], 200);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:post,slug',
            'status' => 'nullable|string|in:draft,published,archived',
            'content' => 'required|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generate slug from title if not provided
        $slug = $request->slug ?? Post::generateUniqueSlug($request->title);

        $post = Post::create([
            'title' => $request->title,
            'slug' => $slug,
            'status' => "1",
            'content' => json_encode($request->content),
            'create_at' => now(),
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Post berhasil dibuat',
            'data' => $post
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $post = Post::find($id);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'nullable|string|max:255',
            'slug' => 'nullable|string|max:255|unique:post,slug,' . $id,
            'status' => 'nullable|string|in:draft,published,archived',
            'content' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Generate slug from title if title changed and slug not provided
        $slug = $post->slug;
        if ($request->has('title') && !$request->has('slug')) {
            $slug = Post::generateUniqueSlug($request->title, $id);
        } elseif ($request->has('slug')) {
            $slug = $request->slug;
        }

        $post->update([
            'title' => $request->title ?? $post->title,
            'slug' => $slug,
            'content' => $request->has('content') ? json_encode($request->content) : $post->content,
            'update_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Post berhasil diperbarui',
            'data' => $post
        ], 200);
    }

    public function destroy($id)
    {
        $post = Post::find($id);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post tidak ditemukan'
            ], 404);
        }

        $post->update([
            'status' => "N"
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Post berhasil dihapus'
        ], 200);
    }

    /**
     * Show post by slug
     */
    public function showBySlug($slug)
    {
        $post = Post::findBySlug($slug);

        if (!$post) {
            return response()->json([
                'success' => false,
                'message' => 'Post tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $post
        ], 200);
    }
}
