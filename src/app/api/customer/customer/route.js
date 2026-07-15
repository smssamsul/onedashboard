import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// GET: Ambil data customer profile (untuk sync setelah login)
export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Forward GET request ke backend
    const response = await fetch(`${BACKEND_URL}/api/customer/customer`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    console.log("🟢 [CUSTOMER_GET] Backend response:", data);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal mengambil data customer" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data?.data || data,
    });
  } catch (error) {
    console.error("❌ [CUSTOMER_GET] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST: Update data customer
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

    console.log("🟢 [CUSTOMER_UPDATE] Request body:", body);
    console.log("🟢 [CUSTOMER_UPDATE] Token:", token ? "exists" : "missing");

    // Forward ke backend
    const response = await fetch(`${BACKEND_URL}/api/customer/customer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log("🟢 [CUSTOMER_UPDATE] Backend response:", data);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal mengupdate customer" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [CUSTOMER_UPDATE] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat mengupdate customer" },
      { status: 500 }
    );
  }
}

