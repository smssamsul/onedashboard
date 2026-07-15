import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request, { params }) {
  try {
    const { idCustomer } = await params;

    if (!idCustomer) {
      return NextResponse.json(
        { success: false, message: "ID customer tidak ditemukan" },
        { status: 400 }
      );
    }

    const customerId = Number(idCustomer);
    if (Number.isNaN(customerId)) {
      return NextResponse.json(
        { success: false, message: "ID customer tidak valid" },
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

    const backendUrl = `${BACKEND_URL}/api/sales/customer/riwayat-order/${customerId}`;
    console.log("🔍 [CUSTOMER HISTORY] Fetch:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch((err) => {
      console.error("❌ [CUSTOMER HISTORY] JSON parse error:", err);
      return null;
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil riwayat order",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("❌ [CUSTOMER HISTORY] API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil riwayat order",
      },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

