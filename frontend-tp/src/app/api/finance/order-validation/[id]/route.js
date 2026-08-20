import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "ID tidak ditemukan",
          error: "Missing ID parameter",
        },
        { status: 400 }
      );
    }
    
    // Build backend URL
    const backendUrl = `${BACKEND_URL}/api/finance/order-validation/${id}`;
    
    
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
      console.error("❌ [FINANCE-ORDER-DETAIL] Backend mengembalikan HTML, bukan JSON!");
      console.error("❌ [FINANCE-ORDER-DETAIL] Full response:", text.substring(0, 1000));
      
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
    } catch (e) {
      console.error("❌ [FINANCE-ORDER-DETAIL] Invalid JSON response:", text);
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan response yang tidak valid",
          error: "Invalid JSON response",
        },
        { status: 500 }
      );
    }

    // Return the response from backend
    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [FINANCE-ORDER-DETAIL] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat memuat detail order",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

