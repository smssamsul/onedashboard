<?php

namespace App\Http\Controllers\Api\Hr;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TodoList;
use App\Models\User;
use App\Models\HrKaryawan;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class HrTodoListController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    /**
     * Get all todos for all employees (HR view)
     */
    public function index(Request $request)
    {
        $query = TodoList::with(['creator', 'assignee']);

        // Filter by employee
        if ($request->has('karyawan_id') && $request->karyawan_id) {
            $karyawan = HrKaryawan::find($request->karyawan_id);
            if ($karyawan && $karyawan->user_id) {
                $query->where('assigned_to', $karyawan->user_id);
            }
        }

        // Filter by status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }
        // Remove default filter to show all todos

        // Filter by priority
        if ($request->has('priority') && $request->priority) {
            $query->where('priority', $request->priority);
        }

        // Filter by due_date
        if ($request->has('due_date') && $request->due_date) {
            $dueDate = Carbon::parse($request->due_date)->format('Y-m-d');
            $query->whereDate('due_date', $dueDate);
        }

        // Filter by date range
        if ($request->has('tanggal_mulai') && $request->has('tanggal_akhir') && 
            $request->tanggal_mulai && $request->tanggal_akhir) {
            $query->whereBetween('due_date', [
                Carbon::parse($request->tanggal_mulai)->format('Y-m-d'),
                Carbon::parse($request->tanggal_akhir)->format('Y-m-d')
            ]);
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
     * Get statistics
     */
    public function statistics(Request $request)
    {
        $total = TodoList::count();
        $pending = TodoList::where('status', 'pending')->count();
        $inProgress = TodoList::where('status', 'in_progress')->count();
        $completed = TodoList::where('status', 'completed')->count();
        $highPriority = TodoList::where('priority', 'high')->where('status', '!=', 'completed')->count();
        $overdue = TodoList::where('due_date', '<', Carbon::today())
            ->where('status', '!=', 'completed')
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'pending' => $pending,
                'in_progress' => $inProgress,
                'completed' => $completed,
                'high_priority' => $highPriority,
                'overdue' => $overdue,
            ]
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
            })
            ->where('status', '!=', 'completed');

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
}
