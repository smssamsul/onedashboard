import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

// Optional service token so public flows (landing/verify-order) can still
// authenticate to the backend without exposing credentials to the browser.
const PUBLIC_OTP_TOKEN =
  process.env.OTP_PUBLIC_TOKEN ||
  process.env.LANDING_AUTH_TOKEN ||
  process.env.OTP_SERVICE_TOKEN ||
  null;

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || null;

    const body = await request.json();

    console.log("🟢 [OTP_RESEND] Request body:", body);
    console.log("🟢 [OTP_RESEND] Has token:", !!token);

    // Validasi body
    if (!body.customer_id || !body.wa) {
      return NextResponse.json(
        { success: false, message: "customer_id dan wa harus diisi" },
        { status: 400 }
      );
    }

    const authHeaders =
      token
        ? { Authorization: `Bearer ${token}` }
        : PUBLIC_OTP_TOKEN
          ? { Authorization: `Bearer ${PUBLIC_OTP_TOKEN}` }
          : {};

    const response = await fetch(`${BACKEND_URL}/api/customer/otp/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({
        customer_id: parseInt(body.customer_id, 10),
        wa: String(body.wa),
      }),
    });

    console.log("🟢 [OTP_RESEND] Backend status:", response.status);

    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("❌ [OTP_RESEND] Non-JSON response:", responseText.substring(0, 500));
      return NextResponse.json(
        { success: false, message: "Backend error: Response bukan JSON" },
        { status: 500 }
      );
    }

    console.log("🟢 [OTP_RESEND] Backend response:", data);

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal mengirim ulang OTP" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "OTP berhasil dikirim ulang",
      data: data?.data || data,
    });
  } catch (error) {
    console.error("❌ [OTP_RESEND] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan saat mengirim ulang OTP" },
      { status: 500 }
    );
  }
}

