import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const res = await fetch(`${BACKEND_URL}/api/sales/order/utm-filter-options`, {
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
        { success: false, message: "Invalid JSON from backend", data: {} },
        { status: 500 }
      );
    }
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    console.error("utm-filter-options proxy:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Error", data: {} },
      { status: 500 }
    );
  }
}
