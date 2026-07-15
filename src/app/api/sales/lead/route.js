import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.customer_id) {
      return NextResponse.json(
        { success: false, message: "customer_id wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!body.lead_label || !body.lead_label.trim()) {
      return NextResponse.json(
        { success: false, message: "lead_label wajib diisi" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Format dates to "YYYY-MM-DD HH:mm:ss" if provided
    const formatDateTime = (date) => {
      if (!date) return null;
      if (typeof date === "string") {
        // If already in correct format, return as is
        if (date.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          return date;
        }
        // Try to parse and format
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      if (date instanceof Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      }
      return null;
    };

    // Build payload according to API documentation
    const payload = {
      customer_id: Number(body.customer_id),
      lead_label: String(body.lead_label).trim(),
      status: body.status || "NEW",
      ...(body.sales_id && { sales_id: Number(body.sales_id) }),
      ...(body.minat_produk && body.minat_produk.trim() && { minat_produk: String(body.minat_produk).trim() }),
      ...(body.alasan_tertarik && body.alasan_tertarik.trim() && { alasan_tertarik: String(body.alasan_tertarik).trim() }),
      ...(body.alasan_belum && body.alasan_belum.trim() && { alasan_belum: String(body.alasan_belum).trim() }),
      ...(body.harapan && body.harapan.trim() && { harapan: String(body.harapan).trim() }),
      ...(body.last_contact_at && { last_contact_at: formatDateTime(body.last_contact_at) }),
      ...(body.next_follow_up_at && { next_follow_up_at: formatDateTime(body.next_follow_up_at) }),
    };

    console.log("🔍 [LEAD POST] Creating lead with payload:", payload);
    console.log("🔍 [LEAD POST] Backend URL:", `${BACKEND_URL}/api/sales/lead`);

    const response = await fetch(`${BACKEND_URL}/api/sales/lead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log("🔍 [LEAD POST] Backend response status:", response.status);

    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      console.error("❌ Backend mengembalikan HTML, bukan JSON!");
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON. Kemungkinan endpoint tidak ditemukan atau ada error di backend.",
          error: "HTML response received",
        },
        { status: 500, headers: corsHeaders }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ Response bukan JSON valid:", text.substring(0, 200));
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          error: text.substring(0, 200),
        },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: json.message || "Gagal membuat lead",
          error: json.error || json,
        },
        { status: response.status, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: json.success !== undefined ? json.success : true,
        message: json.message || "Lead berhasil dibuat",
        data: json.data || json,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("❌ Error in /api/sales/lead POST:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
        error: error.message,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const authHeader = request.headers.get("authorization");

    if (!authHeader) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // Build query parameters
    const params = new URLSearchParams();
    
    // Filter parameters
    if (searchParams.get("status") && searchParams.get("status") !== "all") {
      params.append("status", searchParams.get("status"));
    }
    if (searchParams.get("sales_id")) {
      params.append("sales_id", searchParams.get("sales_id"));
    }
    if (searchParams.get("customer_id")) {
      params.append("customer_id", searchParams.get("customer_id"));
    }
    if (searchParams.get("lead_label") && searchParams.get("lead_label") !== "all") {
      params.append("lead_label", searchParams.get("lead_label"));
    }
    if (searchParams.get("search")) {
      params.append("search", searchParams.get("search"));
    }
    
    // Pagination
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "15";
    params.append("page", page);
    params.append("per_page", perPage);

    // Build backend URL
    const backendUrl = `${BACKEND_URL}/api/sales/lead?${params.toString()}`;
    
    console.log("🔍 Fetching leads from:", backendUrl);
    console.log("📄 Query params - page:", page, "per_page:", perPage);

    // Fetch from backend
    const response = await fetch(backendUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: authHeader,
      },
      cache: "no-store",
    });

    const text = await response.text();
    
    // Check if response is HTML
    if (text.trim().startsWith("<!DOCTYPE") || text.trim().startsWith("<html")) {
      console.error("❌ Backend mengembalikan HTML, bukan JSON!");
      return NextResponse.json(
        {
          success: false,
          message: "Backend mengembalikan HTML, bukan JSON. Kemungkinan endpoint tidak ditemukan atau ada error di backend.",
          error: "HTML response received",
          data: [],
          pagination: null,
        },
        { status: 500 }
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      console.error("❌ Response bukan JSON valid:", text.substring(0, 200));
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON response from backend",
          error: text.substring(0, 200),
          data: [],
          pagination: null,
        },
        { status: 500 }
      );
    }

    // Ensure response format is consistent
    if (Array.isArray(json)) {
      return NextResponse.json({
        success: true,
        data: json,
        pagination: null,
      });
    }

    // If backend returns { success, data, pagination }, use it as is
    if (json.success !== undefined) {
      return NextResponse.json({
        success: json.success,
        data: json.data || [],
        message: json.message,
        pagination: json.pagination || null,
      });
    }

    // If backend returns { data: [...] }, wrap it
    if (json.data !== undefined) {
      return NextResponse.json({
        success: true,
        data: Array.isArray(json.data) ? json.data : [json.data],
        pagination: json.pagination || null,
      });
    }

    // Default: return as is
    return NextResponse.json({
      success: true,
      data: [],
      pagination: null,
    });
  } catch (error) {
    console.error("Error in /api/sales/lead:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", data: [], pagination: null },
      { status: 500 }
    );
  }
}

