import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// POST: Parse Excel file untuk broadcast
export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");

    // Ambil form data (file upload)
    const formData = await request.formData();

    // Teruskan ke backend Laravel langsung sebagai multipart
    const response = await fetch(`${BACKEND_URL}/api/sales/broadcast/parse-excel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Jangan set Content-Type — biarkan fetch generate boundary multipart secara otomatis
      },
      body: formData,
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        { success: false, message: "Invalid JSON response from backend" },
        { status: 500 }
      );
    }

    return NextResponse.json(json, { status: response.status });
  } catch (error) {
    console.error("❌ [BROADCAST-PARSE-EXCEL] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
