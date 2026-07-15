<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TodoList;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class TodoListController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get list of todo lists
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = TodoList::with(['creator', 'assignee']);

        // Filter berdasarkan user yang login
        if ($request->has('filter')) {
            switch ($request->filter) {
                case 'my_todos':
                    // Todo yang ditugaskan ke user
                    $query->where('assigned_to', $user->id);
                    break;
                case 'created_by_me':
                    // Todo yang dibuat oleh user
                    $query->where('created_by', $user->id);
                    break;
                case 'pending':
                    $query->where('status', 'pending');
                    break;
                case 'in_progress':
                    $query->where('status', 'in_progress');
                    break;
                case 'completed':
                    $query->where('status', 'completed');
                    break;
            }
        } else {
            // Default: tampilkan todo yang ditugaskan ke user atau dibuat oleh user
            $query->where(function($q) use ($user) {
                $q->where('assigned_to', $user->id)
                  ->orWhere('created_by', $user->id);
            });
        }

        // Filter by priority
        if ($request->has('priority') && $request->priority) {
            $query->where('priority', $request->priority);
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $query->where(function($q) use ($request) {
                $q->where('title', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $perPage = $request->get('per_page', 15);
        $todos = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $todos->items(),
            'pagination' => [
                'current_page' => $todos->currentPage(),
                'last_page' => $todos->lastPage(),
                'per_page' => $todos->perPage(),
                'total' => $todos->total(),
            ]
        ]);
    }

    /**
     * Get single todo
     */
    public function show($id)
    {
        $todo = TodoList::with(['creator', 'assignee'])->find($id);

        if (!$todo) {
            return response()->json([
                'success' => false,
                'message' => 'Todo tidak ditemukan'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $todo
        ]);
    }

    /**
     * Create new todo
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:user,id',
            'priority' => 'nullable|in:low,medium,high',
            'status' => 'nullable|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
            'is_reminder' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        $userLogin = Auth::user(); // UserLogin instance
        $userId = $userLogin->user ?? null; // User ID dari UserLogin
        
        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'User ID tidak ditemukan'
            ], 400);
        }

        $todo = TodoList::create([
            'title' => $request->title,
            'description' => $request->description,
            'created_by' => $userId,
            'assigned_to' => $request->assigned_to ?? $userId,
            'priority' => $request->priority ?? 'medium',
            'status' => $request->status ?? 'pending',
            'due_date' => $request->due_date ? Carbon::parse($request->due_date) : null,
            'is_reminder' => $request->is_reminder ?? false,
        ]);

        $todo->load(['creator', 'assignee']);

        return response()->json([
            'success' => true,
            'message' => 'Todo berhasil dibuat',
            'data' => $todo
        ], 201);
    }

    /**
     * Update todo
     */
    public function update(Request $request, $id)
    {
        $todo = TodoList::find($id);

        if (!$todo) {
            return response()->json([
                'success' => false,
                'message' => 'Todo tidak ditemukan'
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:user,id',
            'priority' => 'nullable|in:low,medium,high',
            'status' => 'nullable|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
            'is_reminder' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // Update status to completed
        if ($request->has('status') && $request->status === 'completed' && $todo->status !== 'completed') {
            $request->merge(['completed_at' => now()]);
        } elseif ($request->has('status') && $request->status !== 'completed' && $todo->status === 'completed') {
            $request->merge(['completed_at' => null]);
        }

        $updateData = $request->only([
            'title', 'description', 'assigned_to', 'priority', 
            'status', 'due_date', 'is_reminder', 'completed_at'
        ]);

        if (isset($updateData['due_date']) && $updateData['due_date']) {
            $updateData['due_date'] = Carbon::parse($updateData['due_date']);
        }

        $todo->update($updateData);
        $todo->load(['creator', 'assignee']);

        return response()->json([
            'success' => true,
            'message' => 'Todo berhasil diupdate',
            'data' => $todo
        ]);
    }

    /**
     * Delete todo
     */
    public function destroy($id)
    {
        $todo = TodoList::find($id);

        if (!$todo) {
            return response()->json([
                'success' => false,
                'message' => 'Todo tidak ditemukan'
            ], 404);
        }

        $todo->delete();

        return response()->json([
            'success' => true,
            'message' => 'Todo berhasil dihapus'
        ]);
    }

    /**
     * Get todos for current user (for absensi modal)
     * Includes todos assigned to user AND todos created by supervisors/leaders for the user
     */
    public function myTodos(Request $request)
    {
        $userLogin = Auth::user(); // UserLogin instance
        $userId = $userLogin->user ?? null; // User ID dari UserLogin
        
        if (!$userId) {
            return response()->json([
                'success' => false,
                'message' => 'User ID tidak ditemukan'
            ], 400);
        }
        
        // Get user data untuk mendapatkan divisi dan level
        $user = User::find($userId);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 404);
        }
        
        // Get user's level to determine if they have supervisors
        $userLevel = $user->level ?? 2; // Default level 2 (staff)
        
        // Get supervisors/leaders (level 1) in the same division
        $supervisors = User::where('divisi', $user->divisi)
            ->where('level', '1')
            ->pluck('id')
            ->toArray();
        
        $query = TodoList::with(['creator', 'assignee'])
            ->where(function($q) use ($userId, $supervisors) {
                // Todos assigned to current user
                $q->where('assigned_to', $userId);
                
                // OR todos created by supervisors/leaders (regardless of assigned_to, but filter by due_date later)
                if (!empty($supervisors)) {
                    $q->orWhereIn('created_by', $supervisors);
                }
            });

        // Filter by due_date if provided
        if ($request->has('due_date') && $request->due_date) {
            $dueDate = Carbon::parse($request->due_date)->format('Y-m-d');
            $query->whereDate('due_date', $dueDate);
        }

        $query->orderBy('priority', 'desc')
            ->orderBy('created_at', 'desc');

        // Limit untuk modal absensi
        $limit = $request->get('limit', 50);
        $todos = $query->limit($limit)->get();

        return response()->json([
            'success' => true,
            'data' => $todos
        ]);
    }

    /**
     * Mark todo as completed
     */
    public function complete($id)
    {
        $todo = TodoList::find($id);

        if (!$todo) {
            return response()->json([
                'success' => false,
                'message' => 'Todo tidak ditemukan'
            ], 404);
        }

        $todo->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $todo->load(['creator', 'assignee']);

        return response()->json([
            'success' => true,
            'message' => 'Todo berhasil diselesaikan',
            'data' => $todo
        ]);
    }
}
