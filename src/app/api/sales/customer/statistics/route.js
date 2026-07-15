import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    const { searchParams } = new URL(request.url);
    const tahun = searchParams.get("tahun") || "all";

    const backendParams = new URLSearchParams();
    backendParams.append("tahun", tahun);

    const backendUrl = `${BACKEND_URL}/api/sales/customer/statistics?${backendParams.toString()}`;

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON.",
          error: "HTML response received",
        },
        { status: 500 }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          error: text.substring(0, 200),
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json?.message || "Gagal mengambil data statistik",
          error: json,
        },
        { status: response.status }
      );
    }

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan saat mengambil data statistik",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
