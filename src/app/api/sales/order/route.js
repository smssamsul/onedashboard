import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    // Extract query parameters from request
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '15';
    const search = searchParams.get('search') || '';

    // Handle multiple values for filters (support both key and key[] formats)
    const statusOrder = [
      ...searchParams.getAll('status_order'),
      ...searchParams.getAll('status_order[]')
    ];
    const statusPembayaran = [
      ...searchParams.getAll('status_pembayaran'),
      ...searchParams.getAll('status_pembayaran[]')
    ];
    const produkIds = [
      ...searchParams.getAll('produk_id'),
      ...searchParams.getAll('produk_id[]')
    ];

    const sumber = searchParams.get('sumber') || '';
    const tanggalFrom = searchParams.get('tanggal_from') || '';
    const tanggalTo = searchParams.get('tanggal_to') || '';
    const waktuPembayaranFrom = searchParams.get('waktu_pembayaran_from') || '';
    const waktuPembayaranTo = searchParams.get('waktu_pembayaran_to') || '';

    const utmFilterCols = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    // Build backend URL with query parameters
    let backendUrl = `${BACKEND_URL}/api/sales/order?page=${page}&per_page=${perPage}`;

    // Auto-format search to Title Case (e.g. "rahmat" -> "Rahmat") to handle case-sensitive backend
    if (search) {
      const formattedSearch = search.replace(/\w\S*/g, (txt) =>
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      backendUrl += `&search=${encodeURIComponent(formattedSearch)}`;
    }

    // Append multiple values
    statusOrder.forEach(val => backendUrl += `&status_order[]=${encodeURIComponent(val)}`);
    statusPembayaran.forEach(val => backendUrl += `&status_pembayaran[]=${encodeURIComponent(val)}`);
    produkIds.forEach(val => backendUrl += `&produk_id[]=${encodeURIComponent(val)}`);

    if (sumber) backendUrl += `&sumber=${encodeURIComponent(sumber)}`;
    if (tanggalFrom) backendUrl += `&tanggal_from=${encodeURIComponent(tanggalFrom)}`;
    if (tanggalTo) backendUrl += `&tanggal_to=${encodeURIComponent(tanggalTo)}`;
    if (waktuPembayaranFrom) backendUrl += `&waktu_pembayaran_from=${encodeURIComponent(waktuPembayaranFrom)}`;
    if (waktuPembayaranTo) backendUrl += `&waktu_pembayaran_to=${encodeURIComponent(waktuPembayaranTo)}`;
    utmFilterCols.forEach((col) => {
      searchParams.getAll(`${col}[]`).forEach((v) => {
        backendUrl += `&${encodeURIComponent(col)}[]=${encodeURIComponent(v)}`;
      });
    });

    console.log("🔍 Fetching orders from:", backendUrl);
    console.log("🔑 Auth header present:", !!authHeader);
    console.log("📄 Query params - page:", page, "per_page:", perPage);

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
    console.log("📥 Response status:", response.status);
    console.log("📥 Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("📥 Response text preview:", text.substring(0, 500));

    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      console.error("❌ Backend mengembalikan HTML, bukan JSON!");
      console.error("❌ Full response:", text.substring(0, 1000));

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
      console.error("❌ Response bukan JSON valid:", text.substring(0, 200));
      console.error("❌ Parse error:", parseError);
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

    // Logging struktur JSON lengkap sesuai requirement
    console.log("✅ Success:", json.success);
    console.log("📊 Data:", json.data);
    console.table(json.data);

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
        pagination: json.pagination, // Forward pagination object if exists
      });
    }

    // If backend returns { data: [...] }, wrap it
    if (json.data !== undefined) {
      return NextResponse.json({
        success: true,
        data: Array.isArray(json.data) ? json.data : [json.data],
      });
    }

    // Fallback: wrap entire response in data array
    return NextResponse.json({
      success: true,
      data: Array.isArray(json) ? json : [json],
    });

  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data order",
        error: error.message,
        data: [],
      },
      { status: 500 }
    );
  }
}

