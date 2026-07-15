<?php

namespace App\Http\Controllers\Api\User;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class UserTaskController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:api');
    }

    public function index(Request $request)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // For now, return mock data
        // TODO: Create task table and implement real CRUD
        $limit = $request->get('limit', 10);
        
        // Mock tasks data
        $tasks = [
            [
                'id' => 1,
                'title' => 'Task 1',
                'description' => 'Deskripsi task 1',
                'status' => 'pending',
                'due_date' => date('Y-m-d', strtotime('+3 days')),
                'created_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 2,
                'title' => 'Task 2',
                'description' => 'Deskripsi task 2',
                'status' => 'progress',
                'due_date' => date('Y-m-d', strtotime('+5 days')),
                'created_at' => date('Y-m-d H:i:s')
            ],
            [
                'id' => 3,
                'title' => 'Task 3',
                'description' => 'Deskripsi task 3',
                'status' => 'completed',
                'due_date' => date('Y-m-d', strtotime('-1 days')),
                'created_at' => date('Y-m-d H:i:s')
            ]
        ];

        // Calculate statistics
        $statistics = [
            'pending' => count(array_filter($tasks, fn($t) => $t['status'] === 'pending')),
            'progress' => count(array_filter($tasks, fn($t) => $t['status'] === 'progress')),
            'completed' => count(array_filter($tasks, fn($t) => $t['status'] === 'completed'))
        ];

        // Apply limit
        if ($limit) {
            $tasks = array_slice($tasks, 0, $limit);
        }

        return response()->json([
            'success' => true,
            'data' => $tasks,
            'statistics' => $statistics
        ]);
    }

    public function show($id)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // TODO: Get task from database
        return response()->json([
            'success' => true,
            'data' => null
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:pending,progress,completed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // TODO: Save to database
        return response()->json([
            'success' => true,
            'message' => 'Task berhasil dibuat',
            'data' => null
        ]);
    }

    public function update(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'status' => 'nullable|in:pending,progress,completed'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal',
                'errors' => $validator->errors()
            ], 422);
        }

        // TODO: Update in database
        return response()->json([
            'success' => true,
            'message' => 'Task berhasil diupdate',
            'data' => null
        ]);
    }

    public function destroy($id)
    {
        $user = auth()->guard('api')->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User tidak ditemukan'
            ], 401);
        }

        // TODO: Delete from database
        return response()->json([
            'success' => true,
            'message' => 'Task berhasil dihapus'
        ]);
    }
}

