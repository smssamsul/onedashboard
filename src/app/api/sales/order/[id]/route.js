import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const { id } = params || {};

    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID tidak ditemukan" }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/api/sales/order/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "Backend error: response bukan JSON", raw_response: text.substring(0, 200) },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, message: "Gagal mengambil detail order", error: e?.message }, { status: 500 });
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}

