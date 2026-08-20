import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
};

export async function GET(request, { params }) {
  try {
    // Next.js 15+ requires params to be awaited
    const { idOrder } = await params;
    
    if (!idOrder) {
      return NextResponse.json(
        { success: false, message: "Order ID tidak ditemukan" },
        { status: 400, headers: corsHeaders }
      );
    }

    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.replace("Bearer ", "");


    // Forward ke backend
    const response = await fetch(`${BACKEND_URL}/api/webinar/join-order/${idOrder}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });


    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      console.error("❌ [WEBINAR_JOIN] Failed to parse JSON:", parseError);
      const text = await response.text();
      console.error("❌ [WEBINAR_JOIN] Response text:", text);
      return NextResponse.json(
        { success: false, message: "Gagal memparse response dari backend" },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      console.error("❌ [WEBINAR_JOIN] Backend error:", data);
      return NextResponse.json(
        { 
          success: false, 
          message: data?.message || "Gagal mengambil data webinar",
          error: data?.error || "Unknown error"
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    // Response sesuai dokumentasi: { success: true, data: { meetingNumber, password, signature, ... } }

    return NextResponse.json(data, { status: response.status, headers: corsHeaders });
  } catch (error) {
    console.error("❌ [WEBINAR_JOIN] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat mengambil data webinar" },
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

