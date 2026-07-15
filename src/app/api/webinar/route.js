import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/config/env";

export async function POST(request) {
  try {
    const body = await request.json();

    const produk = Number(body.produk);
    const topic = body.topic ? String(body.topic).trim() : "";
    const start_time = body.start_time ? String(body.start_time).trim() : "";
    const duration = Number(body.duration) || 60;

    if (!produk || Number.isNaN(produk)) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak valid" },
        { status: 400 }
      );
    }
    if (!topic) {
      return NextResponse.json(
        { success: false, message: "Topic webinar wajib diisi" },
        { status: 400 }
      );
    }
    if (!start_time) {
      return NextResponse.json(
        { success: false, message: "Start time wajib diisi" },
        { status: 400 }
      );
    }

    const payload = {
      produk,
      topic,
      start_time,
      duration,
    };

    // Get authorization token from request
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("🔍 [WEBINAR POST] Creating webinar with payload:", payload);
    console.log("🔍 [WEBINAR POST] Backend URL:", `${BACKEND_URL}/api/sales/webinar`);

    const res = await fetch(`${BACKEND_URL}/api/sales/webinar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    console.log("🔍 [WEBINAR POST] Backend response status:", res.status);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal membuat link Zoom",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("❌ Webinar API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server webinar",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const produk = searchParams.get("produk");

    if (!produk) {
      return NextResponse.json(
        { success: false, message: "Parameter produk wajib diisi" },
        { status: 400 }
      );
    }

    const produkId = Number(produk);
    if (Number.isNaN(produkId)) {
      return NextResponse.json(
        { success: false, message: "ID produk tidak valid" },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    console.log("🔍 [WEBINAR GET] Fetching webinar for produk:", produkId);
    console.log("🔍 [WEBINAR GET] Backend URL:", `${BACKEND_URL}/api/sales/webinar/${produkId}`);

    const res = await fetch(`${BACKEND_URL}/api/sales/webinar/${produkId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    console.log("🔍 [WEBINAR GET] Backend response status:", res.status);

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      // Jika 404, berarti belum ada webinar untuk produk ini (bukan error)
      if (res.status === 404) {
        return NextResponse.json(
          {
            success: false,
            message: "Belum ada webinar untuk produk ini",
            data: null,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: data?.message || "Gagal mengambil data webinar",
          error: data?.error || data,
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("❌ Webinar GET API Proxy Error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal terhubung ke server webinar",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    },
  });
}


