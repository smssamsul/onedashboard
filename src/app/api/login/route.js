import { NextResponse } from 'next/server';
import { getBackendUrl } from '@/config/api';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

/**
 * Login API Proxy Route
 * Proxy untuk menghindari CORS issues
 */
export async function POST(request) {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Log immediately when function is called
  console.log('[LOGIN_PROXY] ========== LOGIN REQUEST STARTED ==========');
  console.log('[LOGIN_PROXY] Request ID:', requestId);
  console.log('[LOGIN_PROXY] Timestamp:', new Date().toISOString());
  console.log('[LOGIN_PROXY] Environment:', process.env.NODE_ENV);
  console.log('[LOGIN_PROXY] Vercel:', !!process.env.VERCEL);
  console.log('[LOGIN_PROXY] Vercel Region:', process.env.VERCEL_REGION || 'unknown');

  try {
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
      console.log('[LOGIN_PROXY] ✅ Request body parsed successfully');
      console.log('[LOGIN_PROXY] Request body:', { email: body.email, password: '***' });
    } catch (parseError) {
      console.error('[LOGIN_PROXY] ❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request body. Email and password are required.',
          error: 'InvalidRequestBody'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate required fields
    if (!body.email || !body.password) {
      console.error('[LOGIN_PROXY] ❌ Missing required fields:', { hasEmail: !!body.email, hasPassword: !!body.password });
      return NextResponse.json(
        {
          success: false,
          message: 'Email dan password wajib diisi.',
          error: 'MissingFields'
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const backendUrl = getBackendUrl('/login');
    console.log('[LOGIN_PROXY] Backend URL:', backendUrl);
    console.log('[LOGIN_PROXY] Request ID:', requestId);

    // Create AbortController for timeout - increase to 30 seconds for Vercel
    const controller = new AbortController();
    const timeoutDuration = 30000; // 30 seconds timeout for Vercel serverless
    const timeoutId = setTimeout(() => {
      console.error('[LOGIN_PROXY] ⏱️ Timeout triggered after', timeoutDuration, 'ms');
      controller.abort();
    }, timeoutDuration);

    let response;
    try {
      const fetchStartTime = Date.now();
      console.log('[LOGIN_PROXY] 🚀 Starting fetch request to backend...');
      console.log('[LOGIN_PROXY] Request ID:', requestId);
      console.log('[LOGIN_PROXY] Backend URL:', backendUrl);
      console.log('[LOGIN_PROXY] Timeout:', timeoutDuration, 'ms');

      // Make the fetch request
      response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Next.js-API-Route/1.0',
          'X-Request-ID': requestId,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        // Don't use keepalive in serverless
        keepalive: false,
      });

      const fetchDuration = Date.now() - fetchStartTime;
      console.log('[LOGIN_PROXY] ✅ Fetch completed in', fetchDuration, 'ms');
      console.log('[LOGIN_PROXY] Request ID:', requestId);
      console.log('[LOGIN_PROXY] Response status:', response.status, response.statusText);
      console.log('[LOGIN_PROXY] Response ok:', response.ok);
      console.log('[LOGIN_PROXY] Response headers:', Object.fromEntries(response.headers.entries()));

      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const fetchDuration = Date.now() - startTime;

      console.error('[LOGIN_PROXY] ❌ ========== FETCH ERROR ==========');
      console.error('[LOGIN_PROXY] Request ID:', requestId);
      console.error('[LOGIN_PROXY] Error after', fetchDuration, 'ms');
      console.error('[LOGIN_PROXY] Error name:', fetchError.name);
      console.error('[LOGIN_PROXY] Error message:', fetchError.message);
      console.error('[LOGIN_PROXY] Error code:', fetchError.code);
      console.error('[LOGIN_PROXY] Error cause:', fetchError.cause);
      if (fetchError.stack) {
        console.error('[LOGIN_PROXY] Error stack:', fetchError.stack);
      }
      console.error('[LOGIN_PROXY] Backend URL attempted:', backendUrl);
      console.error('[LOGIN_PROXY] ====================================');

      // Handle timeout
      if (fetchError.name === 'AbortError') {
        console.error('[LOGIN_PROXY] ⏱️ Request timeout after', timeoutDuration, 'ms');
        return NextResponse.json(
          {
            success: false,
            message: `Request timeout. Server tidak merespons dalam ${timeoutDuration / 1000} detik. Pastikan backend dapat diakses dari Vercel server.`,
            error: 'TimeoutError',
            backendUrl: backendUrl,
            duration: fetchDuration
          },
          { status: 504, headers: corsHeaders }
        );
      }

      // Handle network errors
      if (fetchError.message?.includes('fetch') || fetchError.name === 'TypeError') {
        return NextResponse.json(
          {
            success: false,
            message: `Tidak dapat terhubung ke server backend. Pastikan backend berjalan di ${backendUrl} dan dapat diakses dari Vercel server (bukan hanya dari browser).`,
            error: 'NetworkError',
            backendUrl: backendUrl,
            hint: 'Backend mungkin memblokir request dari Vercel IP. Cek firewall/security group backend.'
          },
          { status: 503, headers: corsHeaders }
        );
      }

      throw fetchError;
    }

    // Check if response is ok
    if (!response.ok) {
      let errorData;
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : { message: `HTTP ${response.status}` };
      } catch {
        errorData = { message: `HTTP ${response.status} ${response.statusText}` };
      }

      return NextResponse.json(
        {
          success: false,
          message: errorData?.message || 'Login gagal',
          error: errorData
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error('[LOGIN_PROXY] Failed to parse response as JSON:', parseError);
      return NextResponse.json(
        {
          success: false,
          message: 'Server mengembalikan response yang tidak valid.',
          error: 'InvalidResponse'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    // Log response for debugging (without sensitive data)
    const totalDuration = Date.now() - startTime;
    console.log('[LOGIN_PROXY] ✅ ========== LOGIN SUCCESS ==========');
    console.log('[LOGIN_PROXY] Request ID:', requestId);
    console.log('[LOGIN_PROXY] Total duration:', totalDuration, 'ms');
    console.log('[LOGIN_PROXY] Response data:', {
      success: data?.success,
      hasToken: !!data?.token,
      hasUser: !!data?.user,
      userId: data?.user?.id,
      userEmail: data?.user?.email,
      userDivisi: data?.user?.divisi
    });
    console.log('[LOGIN_PROXY] ======================================');

    return NextResponse.json(data, {
      status: response.status,
      headers: corsHeaders,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error('[LOGIN_PROXY] ❌ ========== UNEXPECTED ERROR ==========');
    console.error('[LOGIN_PROXY] Request ID:', requestId);
    console.error('[LOGIN_PROXY] Error after', totalDuration, 'ms');
    console.error('[LOGIN_PROXY] Error type:', typeof error);
    console.error('[LOGIN_PROXY] Error name:', error?.name);
    console.error('[LOGIN_PROXY] Error message:', error?.message);
    console.error('[LOGIN_PROXY] Error code:', error?.code);
    if (error?.stack) {
      console.error('[LOGIN_PROXY] Error stack:', error.stack);
    }
    console.error('[LOGIN_PROXY] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('[LOGIN_PROXY] ========================================');

    return NextResponse.json(
      {
        success: false,
        message: 'Gagal terhubung ke server. Coba lagi nanti.',
        error: error?.message || 'Unknown error',
        errorType: error?.name || typeof error,
        duration: totalDuration,
        requestId: requestId
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

