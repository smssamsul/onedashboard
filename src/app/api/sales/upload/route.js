export const runtime = "nodejs";

import { NextResponse } from "next/server";
import FormData from "form-data";

import { BACKEND_URL } from "@/config/env";

// Proxy upload ke backend Laravel untuk avoid mixed content error

export async function POST(request) {
  try {
    // Validate authorization
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { success: false, message: "Content-Type harus multipart/form-data" },
        { status: 400 }
      );
    }

    const incomingFormData = await request.formData();
    
    // Get category for organizing uploads (header, gallery, testimoni, etc.)
    const category = incomingFormData.get("category") || "img";

    // Get file from form data
    const file = incomingFormData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file yang di-upload" },
        { status: 400 }
      );
    }

    // Forward FormData ke backend Laravel
    const forwardFormData = new FormData();
    
    // Convert File to Buffer untuk form-data package
    const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

    forwardFormData.append("file", buffer, {
      filename: file.name,
      contentType: file.type,
    });
    forwardFormData.append("category", category);

    // Forward ke backend Laravel
    const token = authHeader.replace("Bearer ", "");
    
    const response = await fetch(`${BACKEND_URL}/api/sales/upload`, {
      method: "POST",
      headers: {
        ...forwardFormData.getHeaders(),
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: forwardFormData,
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Backend error: Response bukan JSON",
          raw_response: responseText.substring(0, 200),
        },
        { status: response.status || 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          message: data?.message || "Upload gagal",
          errors: data?.errors,
        },
        { status: response.status }
      );
    }

    // Return response dari backend Laravel
    return NextResponse.json(data);

  } catch (error) {
    console.error("❌ [SALES_UPLOAD] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat upload" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

