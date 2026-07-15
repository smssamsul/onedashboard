import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * POST /api/customer/send-otp-by-phone
 * Kirim OTP ke nomor WA (first-time atau lupa password)
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/customer/send-otp-by-phone`, {
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
    console.error("❌ [SEND_OTP_PHONE] Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
