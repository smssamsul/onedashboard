import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization");
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, message: "id wajib" }, { status: 400 });
    }

    const res = await fetch(`${BACKEND_URL}/api/sales/order-resi/${encodeURIComponent(id)}/sync`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
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
