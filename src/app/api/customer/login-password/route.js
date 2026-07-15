import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

/**
 * POST /api/customer/login-password
 * Login dengan no_telp + password (returning user)
 */
export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/customer/login-password`, {
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
    console.error("❌ [LOGIN_PASSWORD] Error:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
