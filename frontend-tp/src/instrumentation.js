
/**
 * Global Instrumentation Hook
 * -------------------------
 * This file allows us to hook into the Next.js server startup process.
 * We use it to register process-level error handlers as a "Final Guard Layer".
 * 
 * Documentation: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // 🛡️ FINAL GUARD: Process-Level Error Interception
        // Catches errors that happen outside of any request context or bypass wrappers.

        process.on('unhandledRejection', (reason, promise) => {
            // Log the full detail securely to server logs
            console.error('🚨 [FATAL_UNHANDLED_REJECTION] System-level promise rejection:', reason);

            // We do NOT exit here to keep the server running, 
            // but this log ensures we know about 'invisible' crashes.
        });

        process.on('uncaughtException', (error) => {
            console.error('🚨 [FATAL_UNCAUGHT_EXCEPTION] System-level exception:', error);

            // In a critical path, you might want to process.exit(1), 
            // but for now we safeguard the logs.

            // Note: We cannot send an HTTP response from here as the context is lost.
            // But we prevent the stack trace from being printed to standard output 
            // in a way that might be captured by loose logging infrastructure.
        });
    }
}
