import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "15";
    const search = searchParams.get("search") || "";

    let backendUrl = `${BACKEND_URL}/api/sales/order/utm?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`;
    if (search) {
      backendUrl += `&search=${encodeURIComponent(search)}`;
    }

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
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON from backend", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: json.success !== false,
      message: json.message,
      data: json.data ?? [],
      pagination: json.pagination,
    });
  } catch (error) {
    console.error("order/utm proxy:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Proxy error", data: [] },
      { status: 500 }
    );
  }
}
