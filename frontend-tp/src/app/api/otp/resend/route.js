import { NextResponse } from "next/server";
import CryptoJS from "crypto-js";

const SECRET_KEY = process.env.NEXT_PUBLIC_OTP_SECRET_KEY;

import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.customer_id || !body?.wa) {
      return NextResponse.json(
        { success: false, message: "customer_id dan wa wajib dikirim" },
        { status: 400 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hash = CryptoJS.HmacSHA256(timestamp, SECRET_KEY).toString(
      CryptoJS.enc.Hex
    );

    const response = await fetch(`${BACKEND_URL}/api/otp/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-Timestamp": timestamp,
        "X-API-Hash": hash,
      },
      body: JSON.stringify({
        customer_id: Number(body.customer_id),
        wa: String(body.wa),
      }),
    });

    const text = await response.text();
    let data = {};

    try {
      data = JSON.parse(text);
    } catch (err) {
      return NextResponse.json(
        { success: false, message: "Response backend bukan JSON" },
        { status: 500 }
      );
    }

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
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
