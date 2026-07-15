<?php

namespace App\Exceptions;

use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * A list of the exception types that are not reported.
     *
     * @var array<int, class-string<Throwable>>
     */
    protected $dontReport = [
        //
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Custom render untuk menangani error khusus (termasuk rate limiter)
     */
    public function render($request, Throwable $exception)
    {
        // 🔹 Untuk request API, pastikan response selalu JSON
        if ($request->is('api/*')) {
            $request->headers->set('Accept', 'application/json');
        }
        
        // 🔹 Tangani error rate limit (Too Many Requests)
        if ($exception instanceof ThrottleRequestsException) {
            // Ambil waktu retry jika tersedia
            $retryAfter = $exception->getHeaders()['Retry-After'] ?? 60;

            return response()->json([
                'success' => false,
                'message' => "Terlalu banyak percobaan, silakan coba lagi dalam {$retryAfter} detik.",
            ], 429)->header('Content-Type', 'application/json');
        }

        // 🔹 Jika request API, pastikan semua error mengembalikan JSON
        if ($request->is('api/*') && $request->expectsJson()) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage() ?: 'An error occurred',
                'error' => get_class($exception),
            ], $this->isHttpException($exception) ? $exception->getStatusCode() : 500)
            ->header('Content-Type', 'application/json');
        }

        // 🔹 Gunakan render bawaan untuk exception lain
        return parent::render($request, $exception);
    }
}