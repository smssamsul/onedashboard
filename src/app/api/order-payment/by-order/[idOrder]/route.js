import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request, { params }) {
  try {
    const { idOrder } = await params;

    if (!idOrder) {
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

    const backendUrl = `${BACKEND_URL}/api/order-payment/by-order/${idOrder}`;
    console.log("🔍 [PAYMENT-HISTORY] Fetch:", backendUrl);

    const res = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch((err) => {
      console.error("❌ [PAYMENT-HISTORY] JSON parse error:", err);
      return null;
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil riwayat pembayaran",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("❌ [PAYMENT-HISTORY] API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Gagal mengambil riwayat pembayaran",
      },
      { status: 500 }
    );
  }
}

