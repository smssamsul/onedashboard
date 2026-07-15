import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// GET: Ambil semua logs follow up
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
    const backendUrl = `${BACKEND_URL}/api/sales/logs-follup`;

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const responseText = await res.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { success: false, message: "Response bukan JSON", raw: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil data logs follow up",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "Data logs follow up berhasil diambil",
      total: data?.total || (Array.isArray(data?.data) ? data.data.length : 0),
      data: data?.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

// POST: Ambil logs follow up berdasarkan customer dan event (optional)
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

    // Validasi request body
    if (!body.customer) {
      return NextResponse.json(
        { success: false, message: "Customer ID diperlukan" },
        { status: 400 }
      );
    }

    const payload = {
      customer: Number(body.customer),
    };

    // Event optional - jika ada, kirim juga
    if (body.event !== undefined && body.event !== null) {
      payload.event = Number(body.event);
    }

    const backendUrl = `${BACKEND_URL}/api/sales/logs-follup`;

    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await res.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        { success: false, message: "Response bukan JSON", raw: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil data logs follow up",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "Data logs follow up berhasil diambil",
      total: data?.total || (Array.isArray(data?.data) ? data.data.length : 0),
      data: data?.data || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan" },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

