import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * 9.1 Kirim OTP Customer
 * POST /api/otp/send
 * 
 * Request: { customer_id, wa }
 * Response: { success, message, data: { otp_id, customer, otp, wa_response } }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    console.log("[OTP_SEND] Request body:", body);

    // Validasi request body
    if (!body?.customer_id || !body?.wa) {
      return NextResponse.json(
        { success: false, message: "customer_id dan wa harus diisi" },
        { status: 400 }
      );
    }

    const payload = {
      customer_id: Number(body.customer_id),
      wa: String(body.wa),
    };

    // Ambil headers auth dari request
    const timestamp = request.headers.get("X-API-Timestamp");
    const hash = request.headers.get("X-API-Hash");

    // Forward ke backend
    const response = await fetch(`${BACKEND_URL}/api/otp/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Timestamp": timestamp || "",
        "X-API-Hash": hash || "",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;

    try {
      data = JSON.parse(responseText);
    } catch (err) {
      console.error("[OTP_SEND] Non-JSON response:", responseText);
      return NextResponse.json(
        { success: false, message: "Backend error: Response bukan JSON" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("[OTP_SEND] Backend error:", data);
      return NextResponse.json(
        { success: false, message: data?.message || "Gagal mengirim OTP" },
        { status: response.status }
      );
    }

    // Return response sesuai format requirement
    return NextResponse.json({
      success: true,
      message: data?.message || "OTP berhasil dikirim ke WhatsApp",
      data: data?.data || data,
    });
  } catch (error) {
    console.error("[OTP_SEND] Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Terjadi kesalahan saat mengirim OTP",
      },
      { status: 500 }
    );
  }
}


