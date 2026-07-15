<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\RabbitMQService;
use Illuminate\Support\Facades\DB;

class RabbitMQDashboardController extends Controller
{
    protected $rabbitmqService;

    public function __construct(RabbitMQService $rabbitmqService)
    {
        $this->rabbitmqService = $rabbitmqService;
    }

    /**
     * Tampilkan dashboard RabbitMQ
     */
    public function index()
    {
        return view('admin.rabbitmq.dashboard');
    }

    /**
     * API: Get dashboard stats
     */
    public function getStats()
    {
        try {
            $stats = $this->rabbitmqService->getDashboardStats();
            
            // Tambahkan failed jobs dari Laravel
            $failedJobsCount = DB::table('failed_jobs')->count();
            $stats['failed_jobs_count'] = $failedJobsCount;

            return response()->json([
                'success' => true,
                'data' => $stats
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil data RabbitMQ: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * API: Get queue detail
     */
    public function getQueueDetail(Request $request)
    {
        $request->validate([
            'vhost' => 'required|string',
            'queue' => 'required|string'
        ]);

        try {
            $detail = $this->rabbitmqService->getQueueDetail(
                $request->vhost,
                $request->queue
            );

            return response()->json([
                'success' => true,
                'data' => $detail
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil detail queue: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * API: Purge queue
     */
    public function purgeQueue(Request $request)
    {
        $request->validate([
            'vhost' => 'required|string',
            'queue' => 'required|string'
        ]);

        try {
            $success = $this->rabbitmqService->purgeQueue(
                $request->vhost,
                $request->queue
            );

            if ($success) {
                return response()->json([
                    'success' => true,
                    'message' => 'Queue berhasil di-purge'
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Gagal purge queue'
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * API: Get failed jobs
     */
    public function getFailedJobs()
    {
        try {
            $failedJobs = DB::table('failed_jobs')
                ->orderBy('failed_at', 'desc')
                ->limit(50)
                ->get();

            return response()->json([
                'success' => true,
                'data' => $failedJobs
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil failed jobs: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * API: Get messages from queue
     */
    public function getQueueMessages(Request $request)
    {
        $request->validate([
            'vhost' => 'required|string',
            'queue' => 'required|string',
            'count' => 'integer|min:1|max:10'
        ]);

        try {
            $messages = $this->rabbitmqService->getMessages(
                $request->vhost,
                $request->queue,
                $request->count ?? 1,
                true // requeue setelah di-read (pesan tidak hilang)
            );

            return response()->json([
                'success' => true,
                'data' => $messages
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengambil messages: ' . $e->getMessage()
            ], 500);
        }
    }
}

