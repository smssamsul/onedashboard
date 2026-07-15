import { NextResponse } from "next/server";

/**
 * Global Error Handler for API Routes
 * -----------------------------------
 * Wraps route handlers to catch ALL unhandled exceptions (Runtime, DB, Network).
 * Guarantees a JSON response and hides internal error details (stack, SQL).
 * 
 * Usage:
 * export const POST = withErrorHandler(async (req) => { ... });
 */
export function withErrorHandler(handler) {
    return async (request, context) => {
        try {
            return await handler(request, context);
        } catch (error) {
            return handleCallbackError(error);
        }
    };
}

/**
 * Processing raw backend responses (fetch).
 * Safely parses JSON and sanitizes generic backend errors (nginx HTML, SQL leaks).
 */
export async function handleBackendResponse(response, logLabel = "[API]") {
    let data;
    let rawText = "";

    try {
        rawText = await response.text();
        // Check for HTML (upstream crash/maintenance)
        if (rawText.trim().startsWith("<") || rawText.includes("<!DOCTYPE")) {
            throw new Error("Received HTML content instead of JSON");
        }
        data = JSON.parse(rawText);
    } catch (err) {
        console.error(`❌ ${logLabel} Upstream Invalid JSON:`, rawText.substring(0, 300));
        return NextResponse.json(
            {
                success: false,
                message: "Terjadi gangguan pada sistem upstream.",
                code: "UPSTREAM_ERROR",
            },
            { status: 502 }
        );
    }

    // Force JSON check even if status is OK, to catch "success: false" leaks
    if (!response.ok || (data && data.success === false)) {
        return sanitizeErrorResponse(data, response.status, logLabel);
    }

    return NextResponse.json(data);
}

/**
 * Handle Code/Runtime Errors (catch block)
 */
function handleCallbackError(error) {
    console.error("💥 [GlobalHandler] Uncaught Exception:", error);

    // Unwrap generic Error objects if they are "Terjadi kesalahan database" to 500
    const message = error.message || String(error);

    // Fallback safe message
    return NextResponse.json(
        {
            success: false,
            message: "Terjadi kesalahan internal pada sistem.",
            code: "INTERNAL_SERVER_ERROR",
        },
        { status: 500 }
    );
}

/**
 * Sanitize Data Object
 */
function sanitizeErrorResponse(data, status, logLabel) {
    const rawString = JSON.stringify(data);

    // 🛡️ ZERO-LEAK PATTERNS
    const sensitivePatterns = [
        /SQLSTATE/i,
        /FATAL/i,
        /password authentication/i,
        /Connection.*failed/i,
        /ECONNREFUSED/i,
        /postgres/i,
        /at files\\/i,
        /at .* \(.*:\d+:\d+\)/,
        /Error: /i,
        /call stack/i
    ];

    const isSensitive = sensitivePatterns.some((pattern) => pattern.test(rawString));

    if (isSensitive || status >= 500) {
        console.error(`🚨 ${logLabel} CRITICAL LEAK PREVENTED [${status}]:`, rawString);
        return NextResponse.json(
            {
                success: false,
                message: "Terjadi kesalahan internal (System Error).",
                code: "INTERNAL_ERROR",
            },
            { status: 500 }
        );
    }

    // Safe client error
    const safeMessage = data?.message || "Terjadi kesalahan request.";
    return NextResponse.json(
        {
            success: false,
            message: safeMessage,
            code: data?.code || "CLIENT_ERROR",
            ...(status === 422 && data.errors ? { errors: data.errors } : {})
        },
        { status: status }
    );
}
