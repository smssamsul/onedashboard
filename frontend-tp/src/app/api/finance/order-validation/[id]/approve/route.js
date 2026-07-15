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

    console.log(`🟢 [FINANCE-APPROVE] Approving order: ${id}`);

    // Forward request to backend
    const response = await fetch(`${BACKEND_URL}/api/finance/order-validation/${id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error("❌ [FINANCE-APPROVE] Invalid JSON response:", text);
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan response yang tidak valid",
          error: "Invalid JSON response",
        },
        { status: 500 }
      );
    }

    console.log(`📥 [FINANCE-APPROVE] Response status: ${response.status}`);
    console.log(`📥 [FINANCE-APPROVE] Response:`, json);

    // Return response from backend
    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [FINANCE-APPROVE] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat approve order",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
