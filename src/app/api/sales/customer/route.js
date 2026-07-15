import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    // Extract query parameters from request
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '15';

    // Build query parameters for backend
    const backendParams = new URLSearchParams();
    backendParams.append('page', page);
    backendParams.append('per_page', perPage);

    // Add filter parameters if present (only if not empty and not "all")
    const verifikasi = searchParams.get('verifikasi');
    if (verifikasi && verifikasi !== 'all' && verifikasi !== '') {
      backendParams.append('verifikasi', verifikasi);
    }

    const status = searchParams.get('status');
    if (status && status !== 'all' && status !== '') {
      backendParams.append('status', status);
    }

    const jenisKelamin = searchParams.get('jenis_kelamin');
    if (jenisKelamin && jenisKelamin !== 'all' && jenisKelamin !== '') {
      backendParams.append('jenis_kelamin', jenisKelamin);
    }

    const dateFrom = searchParams.get('date_from');
    if (dateFrom) {
      backendParams.append('date_from', dateFrom);
    }

    const dateTo = searchParams.get('date_to');
    if (dateTo) {
      backendParams.append('date_to', dateTo);
    }

    // Add search parameter if provided
    const search = searchParams.get('search');
    if (search && search.trim()) {
      backendParams.append('search', search.trim());
    }

    const salesId = searchParams.get('sales_id');
    if (salesId && salesId !== 'all' && salesId !== '') {
      backendParams.append('sales_id', salesId);
    }

    // Build backend URL with query parameters
    const backendUrl = `${BACKEND_URL}/api/sales/customer?${backendParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const text = await response.text();

    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON. Kemungkinan endpoint tidak ditemukan atau ada error di backend.",
          error: "HTML response received",
          data: [],
        },
        { status: 500 }
      );
    }

    let json;

    try {
      json = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          error: text.substring(0, 200),
          data: [],
        },
        { status: 500 }
      );
    }

    // Response validation

    // Ensure response format is consistent
    // If backend returns data directly (array), wrap it in standard format
    if (Array.isArray(json)) {
      return NextResponse.json({
        success: true,
        data: json,
      });
    }

    // If backend returns { success, data, pagination }, use it as is
    if (json.success !== undefined) {
      return NextResponse.json({
        success: json.success,
        data: json.data || json || [],
        message: json.message,
        pagination: json.pagination,
        summary: json.summary, // Forward pagination object if exists
      });
    }

    // If backend returns { data: [...] }, wrap it
    if (json.data !== undefined) {
      return NextResponse.json({
        success: true,
        data: Array.isArray(json.data) ? json.data : [json.data],
        pagination: json.pagination, // Forward pagination if exists
      });
    }

    // Fallback: wrap entire response in data array
    return NextResponse.json({
      success: true,
      data: Array.isArray(json) ? json : [json],
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data customer",
        error: error.message,
        data: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const body = await request.json();

    // Forward ke backend
    const response = await fetch(`${BACKEND_URL}/api/sales/customer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON. Kemungkinan endpoint tidak ditemukan atau ada error di backend.",
          error: "HTML response received",
        },
        { status: 500 }
      );
    }

    let json;

    try {
      json = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          error: text.substring(0, 200),
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json?.message || "Gagal menambahkan customer",
          error: json?.error || json,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat menambahkan customer",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

