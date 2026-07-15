import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {};
    
    if (searchParams.get("type")) params.type = searchParams.get("type");
    if (searchParams.get("product_id")) params.product_id = searchParams.get("product_id");
    if (searchParams.get("search")) params.search = searchParams.get("search");
    if (searchParams.get("per_page")) params.per_page = searchParams.get("per_page");
    if (searchParams.get("page")) params.page = searchParams.get("page");

    const queryString = new URLSearchParams(params).toString();
    const url = `${BACKEND_URL}/api/sales/knowledge-source${queryString ? `?${queryString}` : ""}`;
    
    const authHeader = request.headers.get("authorization");
    
    console.log("🔍 [KNOWLEDGE_SOURCE] Fetching from:", url);
    console.log("🔍 [KNOWLEDGE_SOURCE] Auth header present:", !!authHeader);
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: "no-store",
    });

    console.log("🔍 [KNOWLEDGE_SOURCE] Response status:", res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ [KNOWLEDGE_SOURCE] Error response:", errorText);
      try {
        const errorData = JSON.parse(errorText);
        return NextResponse.json(errorData, { status: res.status });
      } catch {
        return NextResponse.json(
          { success: false, message: errorText || "Gagal mengambil data" },
          { status: res.status }
        );
      }
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");
    
    const res = await fetch(`${BACKEND_URL}/api/sales/knowledge-source`, {
      method: "POST",
      body: JSON.stringify(body),
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
