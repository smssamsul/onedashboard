import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * POST /api/customer/verify-otp-set-password
 * Verifikasi OTP + set password baru (first-time / reset)
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/customer/verify-otp-set-password`, {
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
    console.error("❌ [VERIFY_OTP_SET_PASSWORD] Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
