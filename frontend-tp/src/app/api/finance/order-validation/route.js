import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    // Extract query parameters from request
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const perPage = searchParams.get('per_page') || '15';
    
    // Build backend URL with query parameters
    const backendUrl = `${BACKEND_URL}/api/finance/order-validation?page=${page}&per_page=${perPage}`;
    
    console.log("🔍 [FINANCE-ORDERS] Fetching orders from:", backendUrl);
    console.log("🔑 [FINANCE-ORDERS] Auth header present:", !!authHeader);
    console.log("📄 [FINANCE-ORDERS] Query params - page:", page, "per_page:", perPage);
    
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
    console.log("📥 [FINANCE-ORDERS] Response status:", response.status);
    console.log("📥 [FINANCE-ORDERS] Response text preview:", text.substring(0, 500));
    
    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      console.error("❌ [FINANCE-ORDERS] Backend mengembalikan HTML, bukan JSON!");
      console.error("❌ [FINANCE-ORDERS] Full response:", text.substring(0, 1000));
      
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
    } catch (e) {
      console.error("❌ [FINANCE-ORDERS] Invalid JSON response:", text);
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan response yang tidak valid",
          error: "Invalid JSON response",
          data: [],
        },
        { status: 500 }
      );
    }

    // Forward pagination object if exists
    if (json.pagination) {
      console.log("📊 [FINANCE-ORDERS] Pagination:", json.pagination);
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [FINANCE-ORDERS] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memuat data orders",
        error: error.message,
        data: [],
      },
      { status: 500 }
    );
  }
}
