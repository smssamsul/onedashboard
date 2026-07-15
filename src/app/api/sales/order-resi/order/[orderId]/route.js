import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ success: false, message: "orderId wajib" }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/api/sales/order-resi/order/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
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
        { success: false, message: "Response bukan JSON", raw: text?.slice(0, 300) },
        { status: res.status || 500 }
      );
    }
    return NextResponse.json(json, { status: res.status });
  } catch (e) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }
}
