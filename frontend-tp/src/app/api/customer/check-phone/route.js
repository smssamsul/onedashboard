import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * POST /api/customer/check-phone
 * Step 1: Cek apakah nomor WA terdaftar & sudah punya password
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/customer/check-phone`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("❌ [CHECK_PHONE] Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
