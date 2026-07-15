import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Parse request body
    const body = await request.json();
    const { catatan } = body;

    if (!catatan || !catatan.trim()) {
      return NextResponse.json(
        { success: false, message: "Catatan penolakan harus diisi" },
        { status: 400 }
      );
    }

    const requestBody = { catatan: catatan.trim() };
    const backendUrl = `${BACKEND_URL}/api/finance/order-validation/${id}/reject`;
    
    console.log(`🔴 [FINANCE-REJECT] Rejecting order: ${id}`);
    console.log(`🔴 [FINANCE-REJECT] Backend URL: ${backendUrl}`);
    console.log(`🔴 [FINANCE-REJECT] Request body:`, requestBody);
    console.log(`🔴 [FINANCE-REJECT] Token present:`, !!token);

    // Forward request to backend
    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const text = await response.text();
    console.log(`📥 [FINANCE-REJECT] Response status: ${response.status}`);
    console.log(`📥 [FINANCE-REJECT] Response text:`, text);
    
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("❌ [FINANCE-REJECT] Invalid JSON response:", text);
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan response yang tidak valid",
          error: "Invalid JSON response",
          rawResponse: text.substring(0, 500),
        },
        { status: 500 }
      );
    }

    console.log(`📥 [FINANCE-REJECT] Parsed response:`, json);

    // Return response from backend (forward as-is)
    return NextResponse.json(json, { 
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      }
    });
  } catch (error) {
    console.error("❌ [FINANCE-REJECT] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat reject order",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
