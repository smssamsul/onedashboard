import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_OTP_SECRET_KEY;

import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();
    const { customer_id, otp } = body;

    if (!customer_id || !otp) {
      return NextResponse.json(
        { success: false, message: "customer_id dan otp wajib dikirim" },
        { status: 400 }
      );
    }

    // Generate timestamp & HMAC SHA256 (harus sama dengan backend)
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = CryptoJS.HmacSHA256(timestamp, SECRET_KEY).toString(
      CryptoJS.enc.Hex
    );

    console.log("[OTP_VERIFY] Timestamp:", timestamp);
    console.log("[OTP_VERIFY] Hash:", hash);

    // Kirim ke backend
    const response = await fetch(`${BACKEND_URL}/api/otp/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Timestamp": timestamp,
        "X-API-Hash": hash,
      },
      body: JSON.stringify({
        customer_id,
        otp,
      }),
    });

    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch (err) {
      console.error("Response bukan JSON:", text);
      return NextResponse.json(
        { success: false, message: "Backend error: Invalid JSON" },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal verifikasi OTP",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data?.message || "OTP valid",
      data: data?.data || data,
    });
  } catch (error) {
    console.error("[OTP_VERIFY] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
